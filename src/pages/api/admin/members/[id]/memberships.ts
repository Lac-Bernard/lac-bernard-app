export const prerender = false;
import type { APIRoute } from 'astro';
import { insertAdminAudit } from '../../../../../lib/admin/audit';
import { requireAdminSession } from '../../../../../lib/admin/session';
import { createSupabaseServiceRoleClient } from '../../../../../lib/supabase/service';

const TIERS = new Set(['general', 'associate']);
const METHODS = new Set(['e-transfer', 'cheque', 'cash', 'unknown']);

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
		const method = typeof p.method === 'string' ? p.method.trim() : '';
		if (!METHODS.has(method)) {
			return new Response(JSON.stringify({ error: 'invalid_method' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		if (Number.isNaN(amount) || amount < 0) {
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
		action: 'membership_admin_create',
		entityType: 'membership',
		entityId: result.membership_id ?? null,
		metadata: { member_id: memberId, year, tier, initial },
	});

	return new Response(
		JSON.stringify({
			ok: true,
			membership_id: result.membership_id,
			payment_id: result.payment_id,
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json' } },
	);
};
