import type { APIRoute } from 'astro';
import { insertAdminAudit } from '../../../../../lib/admin/audit';
import { requireAdminSession } from '../../../../../lib/admin/session';
import { createSupabaseServiceRoleClient } from '../../../../../lib/supabase/service';

const METHODS = new Set(['e-transfer', 'cheque', 'cash', 'unknown']);

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

	let body: { amount?: unknown; method?: unknown; date?: unknown; notes?: unknown };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return new Response(JSON.stringify({ error: 'invalid_json' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const amount = typeof body.amount === 'number' ? body.amount : parseFloat(String(body.amount ?? ''));
	const method = typeof body.method === 'string' ? body.method.trim() : '';
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

	const service = createSupabaseServiceRoleClient();
	const { data: rpcResult, error: rpcError } = await service.rpc('record_manual_payment', {
		p_membership_id: membershipId,
		p_amount: amount,
		p_method: method,
		p_payment_date: paymentDate,
		p_notes: notes,
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
		const status = code === 'not_found' ? 404 : code === 'not_pending' ? 409 : 400;
		return new Response(JSON.stringify({ error: code }), {
			status,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	await insertAdminAudit(service, {
		actorUserId: auth.user.id,
		action: 'record_manual_payment',
		entityType: 'membership',
		entityId: membershipId,
		metadata: { amount, method, payment_id: result.payment_id },
	});

	return new Response(
		JSON.stringify({
			ok: true,
			payment_id: result.payment_id,
			membership_id: membershipId,
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json' } },
	);
};
