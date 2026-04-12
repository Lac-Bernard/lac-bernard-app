export const prerender = false;
import type { APIRoute } from 'astro';
import { roundMoney } from '../../../../../lib/admin/manualPaymentSplit';
import { computeRecordPaymentSplit } from '../../../../../lib/admin/recordPaymentSplit';
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

	let body: {
		amount?: unknown;
		method?: unknown;
		date?: unknown;
		notes?: unknown;
		reference?: unknown;
		donation_portion?: unknown;
	};
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return new Response(JSON.stringify({ error: 'invalid_json' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const amount = typeof body.amount === 'number' ? body.amount : parseFloat(String(body.amount ?? ''));
	let method = typeof body.method === 'string' ? body.method.trim().toLowerCase() : '';
	if (method === 'other') method = 'unknown';
	if (!['e-transfer', 'cheque', 'cash', 'unknown'].includes(method)) {
		return new Response(JSON.stringify({ error: 'invalid_method' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (Number.isNaN(amount) || amount <= 0) {
		return new Response(JSON.stringify({ error: 'invalid_amount' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let paymentDate: string | null = null;
	if (body.date !== undefined && body.date !== null && body.date !== '') {
		const d = typeof body.date === 'string' ? body.date : String(body.date);
		if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
			return new Response(JSON.stringify({ error: 'invalid_date' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		paymentDate = d;
	}

	const notes = typeof body.notes === 'string' ? body.notes : null;

	let reference: string | null = null;
	if (body.reference !== undefined && body.reference !== null && body.reference !== '') {
		const r = typeof body.reference === 'string' ? body.reference.trim() : String(body.reference).trim();
		if (r.length > 512) {
			return new Response(JSON.stringify({ error: 'reference_too_long' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		reference = r || null;
	}

	let donationPortion: number | null = null;
	if (body.donation_portion !== undefined && body.donation_portion !== null && body.donation_portion !== '') {
		const dp = typeof body.donation_portion === 'number' ? body.donation_portion : parseFloat(String(body.donation_portion));
		if (!Number.isNaN(dp)) donationPortion = dp;
	}

	const service = createSupabaseServiceRoleClient();

	const { data: msRow, error: msErr } = await service
		.from('memberships')
		.select('tier, status, member_id')
		.eq('id', membershipId)
		.maybeSingle();

	if (msErr) {
		return new Response(JSON.stringify({ error: 'query_failed', detail: msErr.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	if (!msRow) {
		return new Response(JSON.stringify({ error: 'not_found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const { data: payRows, error: payErr } = await service
		.from('payments')
		.select('membership_amount')
		.eq('membership_id', membershipId);

	if (payErr) {
		return new Response(JSON.stringify({ error: 'query_failed', detail: payErr.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const sumMembershipPaid = (payRows ?? []).reduce((s, r) => {
		const v = r.membership_amount;
		const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0));
		return s + (Number.isFinite(n) ? n : 0);
	}, 0);

	const amt = roundMoney(amount);
	const split = computeRecordPaymentSplit({
		amount: amt,
		tier: String(msRow.tier ?? ''),
		membershipStatus: String(msRow.status ?? ''),
		sumMembershipPaid: roundMoney(sumMembershipPaid),
		donationPortion,
	});

	if (!split.ok) {
		const err =
			split.error === 'membership_overpay' ? 'membership_overpay'
			: split.error === 'dues_only_when_pending' ? 'dues_only_when_pending'
			: 'invalid_split';
		return new Response(JSON.stringify({ error: err }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const totalSplit = roundMoney(split.membershipAmount + split.donationAmount);
	if (Math.abs(totalSplit - amt) > 0.001) {
		return new Response(JSON.stringify({ error: 'split_error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const { data: rpcResult, error: rpcError } = await service.rpc('record_manual_payment', {
		p_membership_id: membershipId,
		p_amount: roundMoney(amount),
		p_membership_amount: split.membershipAmount,
		p_donation_amount: split.donationAmount,
		p_method: method,
		p_payment_date: paymentDate,
		p_notes: notes,
		p_donation_note: null,
		p_reference: reference,
	});

	if (rpcError) {
		return new Response(JSON.stringify({ error: 'rpc_failed', detail: rpcError.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const result = rpcResult as { ok?: boolean; error?: string; payment_id?: number } | null;
	if (!result?.ok) {
		const code = result?.error ?? 'unknown';
		const status =
			code === 'not_found' ? 404
			: code === 'dues_only_when_pending' ? 409
			: 400;
		return new Response(JSON.stringify({ error: code }), {
			status,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const auditDate = paymentDate ?? new Date().toISOString().slice(0, 10);

	await insertAdminAudit(service, {
		actorUserId: auth.user.id,
		action: 'record_payment',
		entityType: 'payment',
		entityId: result.payment_id != null ? String(result.payment_id) : undefined,
		metadata: {
			member_id: msRow.member_id,
			membership_id: membershipId,
			amount: roundMoney(amount),
			method,
			date: auditDate ?? undefined,
		},
	});

	return new Response(
		JSON.stringify({
			ok: true,
			payment_id: result.payment_id,
			membership_id: membershipId,
			membership_amount: split.membershipAmount,
			donation_amount: split.donationAmount,
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json' } },
	);
};
