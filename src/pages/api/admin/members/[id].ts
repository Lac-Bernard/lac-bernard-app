import type { APIRoute } from 'astro';
import { insertAdminAudit } from '../../../../lib/admin/audit';
import { adminPatchToRow, parseAdminMemberPatch } from '../../../../lib/admin/memberUpdate';
import { requireAdminSession } from '../../../../lib/admin/session';
import { createSupabaseServiceRoleClient } from '../../../../lib/supabase/service';

export const GET: APIRoute = async ({ request, cookies, params }) => {
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
	const { data, error } = await service.from('members').select('*').eq('id', id).maybeSingle();

	if (error) {
		return new Response(JSON.stringify({ error: 'query_failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	if (!data) {
		return new Response(JSON.stringify({ error: 'not_found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(JSON.stringify({ member: data }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
	const auth = await requireAdminSession(request, cookies);
	if (!auth.ok) return auth.response;

	const id = params.id;
	if (!id) {
		return new Response(JSON.stringify({ error: 'missing_id' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

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

	const service = createSupabaseServiceRoleClient();
	const row = adminPatchToRow(parsed.value);

	const { data: updated, error } = await service.from('members').update(row).eq('id', id).select('id').maybeSingle();

	if (error) {
		return new Response(JSON.stringify({ error: 'update_failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	if (!updated) {
		return new Response(JSON.stringify({ error: 'not_found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	await insertAdminAudit(service, {
		actorUserId: auth.user.id,
		action: 'member_update',
		entityType: 'member',
		entityId: id,
		metadata: { fields: Object.keys(row) },
	});

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
