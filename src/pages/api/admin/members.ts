import type { APIRoute } from 'astro';
import { parseAdminMemberListFilters } from '../../../lib/admin/memberListFilters';
import { requireAdminSession } from '../../../lib/admin/session';
import { createSupabaseServiceRoleClient } from '../../../lib/supabase/service';

const MAX_LIMIT = 100;

export const GET: APIRoute = async ({ request, cookies, url }) => {
	const auth = await requireAdminSession(request, cookies);
	if (!auth.ok) return auth.response;

	const searchParams = url.searchParams;
	const { year, membership, tier, q } = parseAdminMemberListFilters(searchParams);
	const sort = searchParams.get('sort') ?? 'created_at_desc';
	const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
	const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10) || 25));

	const service = createSupabaseServiceRoleClient();
	const offset = (page - 1) * limit;

	const { data: rpcData, error: rpcError } = await service.rpc('admin_members_page', {
		p_year: year,
		p_membership: membership,
		p_tier: tier,
		p_q: q || null,
		p_sort: sort,
		p_limit: limit,
		p_offset: offset,
	});

	if (rpcError) {
		return new Response(JSON.stringify({ error: 'query_failed', detail: rpcError.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const payload = rpcData as {
		members?: unknown[];
		total?: number;
		error?: string;
	} | null;

	if (payload?.error === 'invalid_membership_filter') {
		return new Response(JSON.stringify({ error: 'invalid_membership_filter' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (payload?.error === 'invalid_tier_filter') {
		return new Response(JSON.stringify({ error: 'invalid_tier_filter' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const members = Array.isArray(payload?.members) ? payload!.members : [];
	const total = typeof payload?.total === 'number' ? payload!.total : 0;

	return new Response(
		JSON.stringify({
			members,
			total,
			page,
			limit,
			year,
			membership,
			tier,
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json' } },
	);
};
