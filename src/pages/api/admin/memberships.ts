import type { APIRoute } from 'astro';
import { requireAdminSession } from '../../../lib/admin/session';
import { membershipCentsForTier } from '../../../lib/membership/stripeCheckout';
import { createSupabaseServiceRoleClient } from '../../../lib/supabase/service';

const MAX_LIMIT = 100;

export const GET: APIRoute = async ({ request, cookies, url }) => {
	const auth = await requireAdminSession(request, cookies);
	if (!auth.ok) return auth.response;

	const searchParams = url.searchParams;
	const status = searchParams.get('status');
	const year = searchParams.get('year');
	const memberId = searchParams.get('member_id');
	const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
	const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10) || 50));

	const service = createSupabaseServiceRoleClient();
	let query = service
		.from('memberships')
		.select('id, created_at, member_id, year, tier, status', { count: 'exact' });

	if (status === 'pending' || status === 'active') {
		query = query.eq('status', status);
	}
	if (year) {
		const y = parseInt(year, 10);
		if (!Number.isNaN(y)) query = query.eq('year', y);
	}
	if (memberId) {
		query = query.eq('member_id', memberId);
	}

	query = query.order('year', { ascending: false }).order('created_at', { ascending: false });

	const from = (page - 1) * limit;
	const to = from + limit - 1;
	const { data: rows, error, count } = await query.range(from, to);

	if (error) {
		return new Response(JSON.stringify({ error: 'query_failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const list = rows ?? [];
	const membershipIds = list.map((r) => r.id);
	let paidByMembership = new Map<string, number>();
	if (membershipIds.length > 0) {
		const { data: payRows, error: payErr } = await service
			.from('payments')
			.select('membership_id, membership_amount')
			.in('membership_id', membershipIds);
		if (payErr) {
			return new Response(JSON.stringify({ error: 'payments_query_failed' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		for (const pr of payRows ?? []) {
			const mid = pr.membership_id as string;
			const raw = pr.membership_amount;
			const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? 0));
			const add = Number.isFinite(n) ? n : 0;
			paidByMembership.set(mid, (paidByMembership.get(mid) ?? 0) + add);
		}
	}
	const memberIds = [...new Set(list.map((r) => r.member_id))];
	let memberMap = new Map<
		string,
		{ id: string; first_name: string | null; last_name: string; primary_email: string | null; secondary_email: string | null }
	>();

	if (memberIds.length > 0) {
		const { data: members, error: mErr } = await service
			.from('members')
			.select('id, first_name, last_name, primary_email, secondary_email')
			.in('id', memberIds);

		if (mErr) {
			return new Response(JSON.stringify({ error: 'members_query_failed' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		memberMap = new Map((members ?? []).map((m) => [m.id, m]));
	}

	const memberships = list.map((m) => ({
		...m,
		expected_membership_cents: membershipCentsForTier(m.tier),
		sum_membership_paid: paidByMembership.get(m.id) ?? 0,
		members: memberMap.get(m.member_id) ?? null,
	}));

	return new Response(
		JSON.stringify({
			memberships,
			total: count ?? 0,
			page,
			limit,
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json' } },
	);
};
