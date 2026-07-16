export const prerender = false;
import type { APIRoute } from 'astro';
import { insertAdminAudit } from '../../../../../lib/admin/audit';
import { requireAdminSession } from '../../../../../lib/admin/session';
import { createSupabaseServiceRoleClient } from '../../../../../lib/supabase/service';

export const POST: APIRoute = async ({ request, cookies, params }) => {
	const auth = await requireAdminSession(request, cookies);
	if (!auth.ok) return auth.response;

	const membershipId = params.id;
	if (!membershipId) {
		return new Response(JSON.stringify({ error: 'missing_id' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const service = createSupabaseServiceRoleClient();
	const { data: rpcResult, error: rpcError } = await service.rpc('admin_make_membership_complimentary', {
		p_membership_id: membershipId,
	});

	if (rpcError) {
		return new Response(JSON.stringify({ error: 'rpc_failed', detail: rpcError.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const result = rpcResult as { ok?: boolean; error?: string; membership_id?: string } | null;
	if (!result?.ok) {
		const code = result?.error ?? 'unknown';
		const status = code === 'not_found' ? 404 : code === 'not_pending' ? 409 : 400;
		return new Response(JSON.stringify({ error: code }), {
			status,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	await insertAdminAudit(service, {
		actorUserId: auth.user.id,
		action: 'membership_admin_make_complimentary',
		entityType: 'membership',
		entityId: membershipId,
		metadata: {},
	});

	return new Response(JSON.stringify({ ok: true, membership_id: result.membership_id ?? membershipId }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
