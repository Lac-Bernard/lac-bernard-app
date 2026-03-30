import type { APIRoute } from 'astro';
import { requireAdminSession } from '../../../lib/admin/session';
import { createSupabaseServiceRoleClient } from '../../../lib/supabase/service';

const MAX_LIMIT = 100;

export const GET: APIRoute = async ({ request, cookies, url }) => {
	const auth = await requireAdminSession(request, cookies);
	if (!auth.ok) return auth.response;

	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
	const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(url.searchParams.get('limit') ?? '25', 10) || 25));
	const offset = (page - 1) * limit;

	const service = createSupabaseServiceRoleClient();
	const { data, error } = await service.rpc('admin_audit_log_page', {
		p_limit: limit,
		p_offset: offset,
	});

	if (error) {
		return new Response(JSON.stringify({ error: 'query_failed', detail: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const payload = data as { entries?: unknown[]; total?: number } | null;
	const entries = Array.isArray(payload?.entries) ? payload!.entries : [];
	const total = typeof payload?.total === 'number' ? payload.total : 0;

	return new Response(
		JSON.stringify({
			entries,
			total,
			page,
			limit,
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json' } },
	);
};
