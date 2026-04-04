export const prerender = false;
import type { APIRoute } from 'astro';
import { requireAdminSession } from '../../../../../lib/admin/session';
import { createSupabaseServiceRoleClient } from '../../../../../lib/supabase/service';

const select =
	'*, memberships(id, created_at, member_id, year, tier, status, payments(id, created_at, membership_id, method, amount, date, notes, payment_id, membership_amount, donation_amount, donation_note))';

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
	const { data, error } = await service.from('members').select(select).eq('id', id).maybeSingle();

	if (error) {
		return new Response(JSON.stringify({ error: 'query_failed', detail: error.message }), {
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

	type PaymentRow = {
		id: number;
		created_at: string;
		membership_id: string;
		method: string | null;
		amount: number | null;
		date: string | null;
		notes: string | null;
		payment_id: string | null;
		membership_amount: number | null;
		donation_amount: number | null;
		donation_note: string | null;
	};
	type MembershipRow = {
		id: string;
		created_at: string;
		member_id: string;
		year: number;
		tier: string;
		status: string;
		payments: PaymentRow[] | null;
	};
	const row = data as {
		memberships: MembershipRow[] | null;
		[key: string]: unknown;
	};

	const memberships = (row.memberships ?? []).map((ms) => ({
		...ms,
		payments: [...(ms.payments ?? [])].sort((a, b) => {
			const da = a.date ?? a.created_at;
			const db = b.date ?? b.created_at;
			return db.localeCompare(da);
		}),
	}));
	memberships.sort((a, b) => {
		if (b.year !== a.year) return b.year - a.year;
		return b.created_at.localeCompare(a.created_at);
	});

	const { memberships: _drop, ...member } = row;

	return new Response(JSON.stringify({ member, memberships }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
