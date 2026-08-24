export const prerender = false;
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { insertAdminAudit } from '../../../../../../lib/admin/audit';
import { requireAdminSession } from '../../../../../../lib/admin/session';
import { DONATION_CATEGORIES } from '../../../../../../lib/membership/stripeCheckout';
import { getStripeSecretKey } from '../../../../../../lib/supabase/env';
import { createSupabaseServiceRoleClient } from '../../../../../../lib/supabase/service';

const DONATION_CATEGORY_SET = new Set<string>(DONATION_CATEGORIES);

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
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

	let body: { donationCategory?: unknown };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return new Response(JSON.stringify({ error: 'invalid_json' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let donationCategory: string | null = null;
	if (body.donationCategory !== undefined && body.donationCategory !== null && body.donationCategory !== '') {
		const c = typeof body.donationCategory === 'string' ? body.donationCategory.trim() : '';
		if (!DONATION_CATEGORY_SET.has(c)) {
			return new Response(JSON.stringify({ error: 'invalid_donation_category' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		donationCategory = c;
	}

	const service = createSupabaseServiceRoleClient();

	const { data: pay, error: payErr } = await service
		.from('payments')
		.select('id, membership_id')
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

	const { data: rpcResult, error: rpcError } = await service.rpc('admin_update_payment', {
		p_payment_id: paymentId,
		p_donation_category: donationCategory,
	});

	if (rpcError) {
		return new Response(JSON.stringify({ error: 'rpc_failed', detail: rpcError.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const result = rpcResult as { ok?: boolean; error?: string; donation_category?: string | null } | null;
	if (!result?.ok) {
		const code = result?.error ?? 'unknown';
		const status = code === 'not_found' ? 404 : 400;
		return new Response(JSON.stringify({ error: code }), {
			status,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	await insertAdminAudit(service, {
		actorUserId: auth.user.id,
		action: 'update_payment',
		entityType: 'payment',
		entityId: String(paymentId),
		metadata: {
			membership_id: pay.membership_id,
			member_id: memberId,
			donation_category: result.donation_category ?? null,
		},
	});

	return new Response(
		JSON.stringify({ ok: true, payment_id: paymentId, donation_category: result.donation_category ?? null }),
		{ status: 200, headers: { 'Content-Type': 'application/json' } },
	);
};

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
		.select('id, membership_id, method, amount, payment_id')
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

	let stripeRefundId: string | null = null;

	if (pay.method === 'stripe' && pay.payment_id && pay.amount != null && pay.amount > 0) {
		try {
			const stripe = new Stripe(getStripeSecretKey());
			const refund = await stripe.refunds.create({ payment_intent: pay.payment_id });
			stripeRefundId = refund.id;
		} catch (e) {
			const alreadyRefunded =
				e instanceof Stripe.errors.StripeError && e.code === 'charge_already_refunded';
			if (!alreadyRefunded) {
				console.error('stripe.refunds.create failed for payment delete:', e);
				const detail = e instanceof Error ? e.message : String(e);
				return new Response(JSON.stringify({ error: 'stripe_refund_failed', detail }), {
					status: 502,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		}
	}

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
			stripe_refund_id: stripeRefundId,
		},
	});

	return new Response(JSON.stringify({ ok: true, membership_id: membershipId }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
