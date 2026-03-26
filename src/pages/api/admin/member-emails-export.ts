import type { APIRoute } from 'astro';
import { parseAdminMemberListFilters } from '../../../lib/admin/memberListFilters';
import { requireAdminSession } from '../../../lib/admin/session';
import { createSupabaseServiceRoleClient } from '../../../lib/supabase/service';

const jsonHeaders = {
	'Content-Type': 'application/json; charset=utf-8',
	'Cache-Control': 'no-store',
} as const;

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

/**
 * Comma-separated primary emails — same query params as GET /api/admin/members (omit page, limit, sort).
 * Success: { emails: string }
 */
export const GET: APIRoute = async ({ request, cookies, url }) => {
	try {
		const auth = await requireAdminSession(request, cookies);
		if (!auth.ok) return auth.response;

		const { year, membership, tier, q } = parseAdminMemberListFilters(url.searchParams);

		const service = createSupabaseServiceRoleClient();
		const { data, error } = await service.rpc('admin_members_export_emails', {
			p_year: year,
			p_membership: membership,
			p_tier: tier,
			p_q: q || null,
		});

		if (error) {
			return json({ error: 'export_failed', detail: error.message }, 500);
		}

		const emails = typeof data === 'string' ? data : '';
		return json({ emails });
	} catch (e) {
		const detail = e instanceof Error ? e.message : 'unknown_error';
		return json({ error: 'export_failed', detail }, 500);
	}
};
