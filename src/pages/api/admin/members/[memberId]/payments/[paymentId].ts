export const prerender = false;
import type { APIRoute } from 'astro';
import { insertAdminAudit } from '../../../../../../lib/admin/audit';
import { requireAdminSession } from '../../../../../../lib/admin/session';
import { createSupabaseServiceRoleClient } from '../../../../../../lib/supabase/service';

export const DELETE: APIRoute = async ({ request, cookies, params }) => {
	const auth = await requireAdminSession(request, cookies);
	if (!auth.ok) return auth.response;

	const memberId = params.memberId;
	const paymentIdRaw = params.paymentId;
	if (!memberId || !paymentIdRaw) {
		return new Response(JSON.stringify({ error: 'missing_id' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const paymentId = Number.parseInt(paymentIdRaw, 10);
	if (!Number.isFinite(paymentId) || paymentId < 1) {
		return new Response(JSON.stringify({ error: 'invalid_payment_id' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const service = createSupabaseServiceRoleClient();

	const { data: pay, error: payErr } = await service
		.from('payments')
		.select('id, membership_id, method, amount')
		.eq('id', paymentId)
		.maybeSingle();

	if (payErr) {
		return new Response(JSON.stringify({ error: 'query_failed', detail: payErr.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (!pay) {
		return new Response(JSON.stringify({ error: 'not_found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const { data: ms, error: msErr } = await service
		.from('memberships')
		.select('id, member_id')
		.eq('id', pay.membership_id)
		.maybeSingle();

	if (msErr) {
		return new Response(JSON.stringify({ error: 'query_failed', detail: msErr.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (!ms || ms.member_id !== memberId) {
		return new Response(JSON.stringify({ error: 'not_found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const membershipId = pay.membership_id;

	const { error: delErr } = await service.from('payments').delete().eq('id', paymentId);

	if (delErr) {
		return new Response(JSON.stringify({ error: 'delete_failed', detail: delErr.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const { error: syncErr } = await service.rpc('sync_membership_status_from_payments', {
		p_membership_id: membershipId,
	});

	if (syncErr) {
		console.error('sync_membership_status_from_payments after delete:', syncErr);
		return new Response(JSON.stringify({ error: 'sync_failed', detail: syncErr.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	await insertAdminAudit(service, {
		actorUserId: auth.user.id,
		action: 'delete_payment',
		entityType: 'payment',
		entityId: String(paymentId),
		metadata: {
			membership_id: membershipId,
			member_id: memberId,
			method: pay.method,
			amount: pay.amount,
		},
	});

	return new Response(JSON.stringify({ ok: true, membership_id: membershipId }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
