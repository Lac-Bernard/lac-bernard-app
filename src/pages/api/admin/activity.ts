import type { APIRoute } from 'astro';
import { getMembershipCalendarYear } from '../../../lib/members/membershipYear';
import { requireAdminSession } from '../../../lib/admin/session';
import { createSupabaseServiceRoleClient } from '../../../lib/supabase/service';

const LIMIT_PAYMENTS = 25;
const LIMIT_MEMBERS = 15;
const LIMIT_MEMBERSHIPS = 15;
const LIMIT_AUDIT = 15;

export const GET: APIRoute = async ({ request, cookies }) => {
	const auth = await requireAdminSession(request, cookies);
	if (!auth.ok) return auth.response;

	const service = createSupabaseServiceRoleClient();
	const year = getMembershipCalendarYear();

	const [
		paymentsRaw,
		newMembersRes,
		newMembershipsRaw,
		pendingRes,
		activeRes,
		totalRes,
		newMembersCountRes,
		auditRes,
	] = await Promise.all([
		service
			.from('payments')
			.select('id, created_at, method, amount, date, notes, payment_id, membership_id')
			.order('date', { ascending: false, nullsFirst: false })
			.order('created_at', { ascending: false })
			.limit(LIMIT_PAYMENTS),
		service
			.from('members')
			.select('id, created_at, first_name, last_name, primary_email')
			.eq('status', 'new')
			.order('created_at', { ascending: false })
			.limit(LIMIT_MEMBERS),
		service
			.from('memberships')
			.select('id, created_at, year, tier, status, member_id')
			.order('created_at', { ascending: false })
			.limit(LIMIT_MEMBERSHIPS),
		service.from('memberships').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
		service
			.from('memberships')
			.select('id', { count: 'exact', head: true })
			.eq('year', year)
			.eq('status', 'active'),
		service.from('members').select('id', { count: 'exact', head: true }).eq('status', 'verified'),
		service.from('members').select('id', { count: 'exact', head: true }).eq('status', 'new'),
		service
			.from('admin_audit_log')
			.select('id, created_at, actor_user_id, action, entity_type, entity_id, metadata')
			.order('created_at', { ascending: false })
			.limit(LIMIT_AUDIT),
	]);

	const err =
		paymentsRaw.error ||
		newMembersRes.error ||
		newMembershipsRaw.error ||
		pendingRes.error ||
		activeRes.error ||
		totalRes.error ||
		newMembersCountRes.error ||
		auditRes.error;
	if (err) {
		return new Response(JSON.stringify({ error: 'query_failed', detail: err.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const payments = paymentsRaw.data ?? [];
	const mids = [...new Set(payments.map((p) => p.membership_id))];
	let msById = new Map<string, { id: string; year: number; member_id: string }>();
	if (mids.length > 0) {
		const { data: mships, error: msErr } = await service
			.from('memberships')
			.select('id, year, member_id')
			.in('id', mids);
		if (msErr) {
			return new Response(JSON.stringify({ error: 'query_failed', detail: msErr.message }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		msById = new Map((mships ?? []).map((m) => [m.id, m]));
	}
	const memberIds = [...new Set([...msById.values()].map((m) => m.member_id))];
	let memById = new Map<string, { id: string; first_name: string | null; last_name: string; primary_email: string | null }>();
	if (memberIds.length > 0) {
		const { data: mems, error: memErr } = await service
			.from('members')
			.select('id, first_name, last_name, primary_email')
			.in('id', memberIds);
		if (memErr) {
			return new Response(JSON.stringify({ error: 'query_failed', detail: memErr.message }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		memById = new Map((mems ?? []).map((m) => [m.id, m]));
	}

	const recentPayments = payments.map((p) => {
		const ms = msById.get(p.membership_id);
		const mem = ms ? memById.get(ms.member_id) : undefined;
		return {
			...p,
			membership_year: ms?.year ?? null,
			member: mem
				? {
						id: mem.id,
						first_name: mem.first_name,
						last_name: mem.last_name,
						primary_email: mem.primary_email,
					}
				: null,
		};
	});

	const mshipRows = newMembershipsRaw.data ?? [];
	const mIds2 = [...new Set(mshipRows.map((m) => m.member_id))];
	let memById2 = new Map<string, { id: string; first_name: string | null; last_name: string; primary_email: string | null }>();
	if (mIds2.length > 0) {
		const { data: mems2, error: memErr2 } = await service
			.from('members')
			.select('id, first_name, last_name, primary_email')
			.in('id', mIds2);
		if (memErr2) {
			return new Response(JSON.stringify({ error: 'query_failed', detail: memErr2.message }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		memById2 = new Map((mems2 ?? []).map((m) => [m.id, m]));
	}
	const recentMemberships = mshipRows.map((ms) => ({
		...ms,
		member: memById2.get(ms.member_id) ?? null,
	}));

	return new Response(
		JSON.stringify({
			recentPayments,
			newMembers: newMembersRes.data ?? [],
			recentMemberships,
			counts: {
				pendingMemberships: pendingRes.count ?? 0,
				activeForYear: activeRes.count ?? 0,
				totalMembers: totalRes.count ?? 0,
				newMembersPending: newMembersCountRes.count ?? 0,
				membershipYear: year,
			},
			recentAudit: auditRes.data ?? [],
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
	);
};
