export const prerender = false;
import type { APIRoute } from 'astro';
import { getMembershipCalendarYear } from '../../../lib/members/membershipYear';
import { requireAdminSession } from '../../../lib/admin/session';
import { createSupabaseServiceRoleClient } from '../../../lib/supabase/service';

const LIMIT_VERIFIED_RECENT = 15;
const LIMIT_ACTIVE_RECENT = 15;

type MemberNameRow = {
	id: string;
	first_name: string | null;
	last_name: string;
	secondary_first_name?: string | null;
	secondary_last_name?: string | null;
	primary_email?: string | null;
	created_at?: string;
};

/** Pick display tier for filter year: prefer active row, then pending, then newest. */
function tierForMembershipYear(
	rows: Array<{ member_id: string; tier: string; status: string; created_at: string }>,
	memberId: string,
): string | null {
	const forMember = rows.filter((r) => r.member_id === memberId);
	if (forMember.length === 0) return null;
	const rank = (s: string) => (s === 'active' ? 0 : s === 'pending' ? 1 : 2);
	forMember.sort((a, b) => {
		const d = rank(a.status) - rank(b.status);
		if (d !== 0) return d;
		return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
	});
	return forMember[0]?.tier ?? null;
}

export const GET: APIRoute = async ({ request, cookies }) => {
	const auth = await requireAdminSession(request, cookies);
	if (!auth.ok) return auth.response;

	const service = createSupabaseServiceRoleClient();
	const year = getMembershipCalendarYear();

	const [
		pendingRes,
		activeRes,
		newMembersCountRes,
		verifiedRecentRes,
		activeRecentRes,
	] = await Promise.all([
		service.from('memberships').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
		service
			.from('memberships')
			.select('id', { count: 'exact', head: true })
			.eq('year', year)
			.eq('status', 'active'),
		service.from('members').select('id', { count: 'exact', head: true }).eq('status', 'new'),
		service
			.from('members')
			.select('id, created_at, first_name, last_name, secondary_first_name, secondary_last_name')
			.eq('status', 'verified')
			.order('created_at', { ascending: false })
			.limit(LIMIT_VERIFIED_RECENT),
		service
			.from('memberships')
			.select('id, created_at, activated_at, year, tier, member_id')
			.eq('status', 'active')
			.order('activated_at', { ascending: false, nullsFirst: false })
			.order('created_at', { ascending: false })
			.limit(LIMIT_ACTIVE_RECENT),
	]);

	const err =
		pendingRes.error ||
		activeRes.error ||
		newMembersCountRes.error ||
		verifiedRecentRes.error ||
		activeRecentRes.error;
	if (err) {
		return new Response(JSON.stringify({ error: 'query_failed', detail: err.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const verifiedMembers = (verifiedRecentRes.data ?? []) as MemberNameRow[];
	const verifiedIds = verifiedMembers.map((m) => m.id);

	let tierByMemberId = new Map<string, string | null>();
	if (verifiedIds.length > 0) {
		const { data: msForYear, error: msErr } = await service
			.from('memberships')
			.select('member_id, tier, status, created_at')
			.in('member_id', verifiedIds)
			.eq('year', year);
		if (msErr) {
			return new Response(JSON.stringify({ error: 'query_failed', detail: msErr.message }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		for (const id of verifiedIds) {
			tierByMemberId.set(id, tierForMembershipYear(msForYear ?? [], id));
		}
	}

	const recentVerifiedMembers = verifiedMembers.map((m) => ({
		member: m,
		tier: tierByMemberId.get(m.id) ?? null,
		eventAt: m.created_at ?? '',
	}));

	const activeMsRows = activeRecentRes.data ?? [];
	const activeMemberIds = [...new Set(activeMsRows.map((r) => r.member_id))];
	let memById = new Map<string, MemberNameRow>();
	if (activeMemberIds.length > 0) {
		const { data: mems, error: memErr } = await service
			.from('members')
			.select('id, first_name, last_name, secondary_first_name, secondary_last_name, primary_email')
			.in('id', activeMemberIds);
		if (memErr) {
			return new Response(JSON.stringify({ error: 'query_failed', detail: memErr.message }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		memById = new Map((mems ?? []).map((m) => [m.id, m as MemberNameRow]));
	}

	const recentActiveMemberships = activeMsRows.map((ms) => ({
		membership: {
			id: ms.id,
			year: ms.year,
			tier: ms.tier,
			created_at: ms.created_at,
			activated_at: ms.activated_at,
		},
		member: memById.get(ms.member_id) ?? null,
	}));

	return new Response(
		JSON.stringify({
			recentVerifiedMembers,
			recentActiveMemberships,
			counts: {
				pendingMemberships: pendingRes.count ?? 0,
				activeForYear: activeRes.count ?? 0,
				newMembersPending: newMembersCountRes.count ?? 0,
				membershipYear: year,
			},
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
	);
};
