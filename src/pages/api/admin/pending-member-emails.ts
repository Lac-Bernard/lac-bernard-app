import type { APIRoute } from 'astro';
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
 * Comma-separated primary emails for pending membership rows.
 * Success: { emails: string }
 */
export const GET: APIRoute = async ({ request, cookies }) => {
	try {
		const auth = await requireAdminSession(request, cookies);
		if (!auth.ok) return auth.response;

		const service = createSupabaseServiceRoleClient();
		const { data, error } = await service.rpc('admin_pending_members_export_emails');

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
