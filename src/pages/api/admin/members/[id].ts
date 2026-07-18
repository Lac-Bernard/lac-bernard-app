export const prerender = false;
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

export const DELETE: APIRoute = async ({ request, cookies, params }) => {
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

	const { data: memberSnapshot } = await service.from('members').select('*').eq('id', id).maybeSingle();

	const { data: rpcResult, error: rpcError } = await service.rpc('admin_delete_member', { p_member_id: id });

	if (rpcError) {
		return new Response(JSON.stringify({ error: 'rpc_failed', detail: rpcError.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const result = rpcResult as { ok?: boolean; error?: string; member_id?: string; user_id?: string | null } | null;
	if (!result?.ok) {
		const code = result?.error ?? 'unknown';
		const status = code === 'not_found' ? 404 : code === 'has_memberships' ? 409 : 400;
		return new Response(JSON.stringify({ error: code }), {
			status,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (result.user_id) {
		await service.auth.admin.deleteUser(result.user_id);
	}

	await insertAdminAudit(service, {
		actorUserId: auth.user.id,
		action: 'member_delete',
		entityType: 'member',
		entityId: id,
		metadata: { member: memberSnapshot },
	});

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
