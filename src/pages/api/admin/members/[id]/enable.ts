export const prerender = false;
import type { APIRoute } from 'astro';
import { insertAdminAudit } from '../../../../../lib/admin/audit';
import { requireAdminSession } from '../../../../../lib/admin/session';
import { createSupabaseServiceRoleClient } from '../../../../../lib/supabase/service';

export const POST: APIRoute = async ({ request, cookies, params }) => {
	const auth = await requireAdminSession(request, cookies);
	if (!auth.ok) return auth.response;

	const id = params.id;
	if (!id) {
		return new Response(JSON.stringify({ error: 'missing_id' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const service = createSupabaseServiceRoleClient();
	const { data: existing, error: exErr } = await service.from('members').select('id, status').eq('id', id).maybeSingle();
	if (exErr || !existing) {
		return new Response(JSON.stringify({ error: 'not_found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (existing.status !== 'disabled') {
		return new Response(JSON.stringify({ error: 'not_disabled' }), {
			status: 409,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const { error } = await service.from('members').update({ status: 'enrolled' }).eq('id', id);
	if (error) {
		return new Response(JSON.stringify({ error: 'update_failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	await insertAdminAudit(service, {
		actorUserId: auth.user.id,
		action: 'enable_member',
		entityType: 'member',
		entityId: id,
		metadata: {},
	});

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
