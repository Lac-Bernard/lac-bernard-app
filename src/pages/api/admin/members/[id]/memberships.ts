export const prerender = false;
import type { APIRoute } from 'astro';
import { roundMoney } from '../../../../../lib/admin/manualPaymentSplit';
import { insertAdminAudit } from '../../../../../lib/admin/audit';
import { requireAdminSession } from '../../../../../lib/admin/session';
import { createSupabaseServiceRoleClient } from '../../../../../lib/supabase/service';

const TIERS = new Set(['voting', 'associate']);

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

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'invalid_json' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const o = body as Record<string, unknown>;
	const yearRaw = o.year;
	const year = typeof yearRaw === 'number' ? yearRaw : parseInt(String(yearRaw ?? ''), 10);
	const tier = typeof o.tier === 'string' ? o.tier.trim() : '';
	const initial = typeof o.initial === 'string' ? o.initial.trim() : '';

	if (!Number.isFinite(year) || year < 2000 || year > 2100) {
		return new Response(JSON.stringify({ error: 'invalid_year' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	if (!TIERS.has(tier)) {
		return new Response(JSON.stringify({ error: 'invalid_tier' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	if (initial !== 'pending' && initial !== 'active_with_payment') {
		return new Response(JSON.stringify({ error: 'invalid_initial' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const pOutcome = initial === 'pending' ? 'pending' : 'record_payment';

	let pAmount: number | null = null;
	let pMethod: string | null = null;
	let pPaymentDate: string | null = null;
	let pNotes: string | null = null;
	let pDonationPortion: number | null = null;
	let pReference: string | null = null;

	if (initial === 'active_with_payment') {
		const pay = o.payment;
		if (pay === null || pay === undefined || typeof pay !== 'object') {
			return new Response(JSON.stringify({ error: 'payment_required' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		const p = pay as Record<string, unknown>;
		const amount = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount ?? ''));
		let method = typeof p.method === 'string' ? p.method.trim().toLowerCase() : '';
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
		pAmount = amount;
		pMethod = method;
		if (p.date !== undefined && p.date !== null && p.date !== '') {
			const d = typeof p.date === 'string' ? p.date : String(p.date);
			if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
				return new Response(JSON.stringify({ error: 'invalid_date' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			pPaymentDate = d;
		}
		pNotes = typeof p.notes === 'string' ? p.notes : null;
		if (p.donation_portion !== undefined && p.donation_portion !== null && p.donation_portion !== '') {
			const dp = typeof p.donation_portion === 'number' ? p.donation_portion : parseFloat(String(p.donation_portion));
			if (!Number.isNaN(dp)) pDonationPortion = dp;
		}
		if (p.reference !== undefined && p.reference !== null && typeof p.reference === 'string') {
			const r = p.reference.trim();
			pReference = r.length > 512 ? r.slice(0, 512) : r || null;
		}
	}

	const service = createSupabaseServiceRoleClient();
	const { data: rpcResult, error: rpcError } = await service.rpc('admin_create_membership', {
		p_member_id: memberId,
		p_year: year,
		p_tier: tier,
		p_outcome: pOutcome,
		p_amount: pAmount,
		p_method: pMethod,
		p_payment_date: pPaymentDate,
		p_notes: pNotes,
		p_donation_portion: pDonationPortion,
		p_reference: pReference,
	});

	if (rpcError) {
		return new Response(JSON.stringify({ error: 'rpc_failed', detail: rpcError.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const result = rpcResult as {
		ok?: boolean;
		error?: string;
		membership_id?: string;
		payment_id?: number;
	} | null;
	if (!result?.ok) {
		const code = result?.error ?? 'unknown';
		let status = 400;
		if (code === 'member_not_found' || code === 'not_found') status = 404;
		else if (code === 'already_exists') status = 409;
		return new Response(JSON.stringify({ error: code }), {
			status,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	await insertAdminAudit(service, {
		actorUserId: auth.user.id,
		action: 'add_membership',
		entityType: 'membership',
		entityId: result.membership_id ?? undefined,
		metadata: { member_id: memberId, year, tier, initial },
	});

	if (initial === 'active_with_payment' && result.payment_id != null) {
		const auditDate = pPaymentDate ?? new Date().toISOString().slice(0, 10);
		await insertAdminAudit(service, {
			actorUserId: auth.user.id,
			action: 'record_payment',
			entityType: 'payment',
			entityId: String(result.payment_id),
			metadata: {
				member_id: memberId,
				membership_id: result.membership_id ?? undefined,
				amount: roundMoney(pAmount ?? 0),
				method: pMethod,
				date: auditDate,
			},
		});
	}

	return new Response(
		JSON.stringify({
			ok: true,
			membership_id: result.membership_id,
			payment_id: result.payment_id,
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json' } },
	);
};
