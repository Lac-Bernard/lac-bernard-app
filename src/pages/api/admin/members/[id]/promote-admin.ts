import type { APIRoute } from 'astro';
import { insertAdminAudit } from '../../../../../lib/admin/audit';
import { requireAdminSession } from '../../../../../lib/admin/session';
import { createSupabaseServiceRoleClient } from '../../../../../lib/supabase/service';

export const POST: APIRoute = async ({ request, cookies, params }) => {
	const auth = await requireAdminSession(request, cookies);
	if (!auth.ok) return auth.response;

	const memberId = params.id;
	if (!memberId) {
		return new Response(JSON.stringify({ error: 'missing_id' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const service = createSupabaseServiceRoleClient();
	const { data: member, error: mErr } = await service
		.from('members')
		.select('user_id, primary_email')
		.eq('id', memberId)
		.maybeSingle();

	if (mErr || !member) {
		return new Response(JSON.stringify({ error: 'not_found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (!member.user_id) {
		return new Response(JSON.stringify({ error: 'no_linked_account' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const { data: userData, error: getErr } = await service.auth.admin.getUserById(member.user_id);
	if (getErr || !userData?.user) {
		return new Response(JSON.stringify({ error: 'auth_lookup_failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const existing = userData.user.app_metadata ?? {};
	const { error: upErr } = await service.auth.admin.updateUserById(member.user_id, {
		app_metadata: { ...existing, role: 'admin' },
	});

	if (upErr) {
		return new Response(JSON.stringify({ error: 'promote_failed', detail: upErr.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	await insertAdminAudit(service, {
		actorUserId: auth.user.id,
		action: 'promote_admin',
		entityType: 'member',
		entityId: memberId,
		metadata: { target_user_id: member.user_id },
	});

	return new Response(JSON.stringify({ ok: true, user_id: member.user_id }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
