import type { APIRoute } from 'astro';
import { insertAdminAudit } from '../../../../../lib/admin/audit';
import { requireAdminSession } from '../../../../../lib/admin/session';
import { createSupabaseServiceRoleClient } from '../../../../../lib/supabase/service';

/**
 * Deletes a pending membership row (admin cleanup). Member must create a new pending row after sign-in.
 */
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

	const { data: existing, error: fetchErr } = await service
		.from('memberships')
		.select('id, status, member_id, year, tier')
		.eq('id', membershipId)
		.maybeSingle();

	if (fetchErr) {
		return new Response(JSON.stringify({ error: 'lookup_failed', detail: fetchErr.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (!existing) {
		return new Response(JSON.stringify({ error: 'not_found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (existing.status !== 'pending') {
		return new Response(JSON.stringify({ error: 'not_pending' }), {
			status: 409,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const { error: delErr } = await service.from('memberships').delete().eq('id', membershipId);

	if (delErr) {
		return new Response(JSON.stringify({ error: 'delete_failed', detail: delErr.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	await insertAdminAudit(service, {
		actorUserId: auth.user.id,
		action: 'cancel_pending_membership',
		entityType: 'membership',
		entityId: membershipId,
		metadata: {
			member_id: existing.member_id,
			year: existing.year,
			tier: existing.tier,
		},
	});

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
