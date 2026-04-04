export const prerender = false;
import type { APIRoute } from 'astro';
import { insertAdminAudit } from '../../../lib/admin/audit';
import { adminPatchToRow, parseAdminMemberPatch } from '../../../lib/admin/memberUpdate';
import { parseAdminMemberListFilters } from '../../../lib/admin/memberListFilters';
import { requireAdminSession } from '../../../lib/admin/session';
import { createSupabaseServiceRoleClient } from '../../../lib/supabase/service';

const MAX_LIMIT = 100;

export const GET: APIRoute = async ({ request, cookies, url }) => {
	const auth = await requireAdminSession(request, cookies);
	if (!auth.ok) return auth.response;

	const searchParams = url.searchParams;
	const { year, membership, tier, memberStatus, q } = parseAdminMemberListFilters(searchParams);
	const sort = searchParams.get('sort') ?? 'created_at_desc';
	const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
	const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10) || 25));

	const service = createSupabaseServiceRoleClient();
	const offset = (page - 1) * limit;

	const { data: rpcData, error: rpcError } = await service.rpc('admin_members_page', {
		p_year: year,
		p_membership: membership,
		p_tier: tier,
		p_member_status: memberStatus,
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

	if (payload?.error === 'invalid_member_status_filter') {
		return new Response(JSON.stringify({ error: 'invalid_member_status_filter' }), {
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
			memberStatus,
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json' } },
	);
};

export const POST: APIRoute = async ({ request, cookies }) => {
	const auth = await requireAdminSession(request, cookies);
	if (!auth.ok) return auth.response;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'invalid_json' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const parsed = parseAdminMemberPatch(body);
	if (!parsed.ok) {
		return new Response(JSON.stringify({ error: parsed.error }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const row = adminPatchToRow(parsed.value);
	if (!Object.prototype.hasOwnProperty.call(parsed.value, 'user_id')) {
		row.user_id = null;
	}
	/** Admin-created members are directory-ready unless status was explicitly set. */
	if (!Object.prototype.hasOwnProperty.call(parsed.value, 'status')) {
		row.status = 'verified';
	}

	const service = createSupabaseServiceRoleClient();
	const { data: inserted, error } = await service.from('members').insert(row).select('id').maybeSingle();

	if (error) {
		return new Response(JSON.stringify({ error: 'insert_failed', detail: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	if (!inserted?.id) {
		return new Response(JSON.stringify({ error: 'insert_failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	await insertAdminAudit(service, {
		actorUserId: auth.user.id,
		action: 'member_create',
		entityType: 'member',
		entityId: inserted.id,
		metadata: {},
	});

	return new Response(JSON.stringify({ member: { id: inserted.id } }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
