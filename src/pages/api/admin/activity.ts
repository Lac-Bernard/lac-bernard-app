export const prerender = false;
import type { APIRoute } from 'astro';
import { getMembershipCalendarYear } from '../../../lib/members/membershipYear';
import { requireAdminSession } from '../../../lib/admin/session';
import { membershipCentsForTier } from '../../../lib/membership/stripeCheckout';
import { createSupabaseServiceRoleClient } from '../../../lib/supabase/service';

/** Default page size for merged activity timeline. */
const DEFAULT_TIMELINE_LIMIT = 20;
const MAX_TIMELINE_LIMIT = 50;
/** Rows to pull per source when merging (buffer so cross-stream ordering can fill a page). */
function perSourceFetchLimit(pageLimit: number): number {
	return Math.min(120, Math.max(45, pageLimit * 4));
}

type MemberFields = {
	id: string;
	first_name: string | null;
	last_name: string;
	secondary_first_name?: string | null;
	secondary_last_name?: string | null;
	lake_civic_number?: string | null;
	lake_street_name?: string | null;
};

type TimelinePayment = {
	kind: 'payment';
	occurredAt: string;
	memberId: string;
	paymentId: number;
	membershipYear: number;
	tier: string;
	membershipAmount: number | null;
	donationAmount: number | null;
	method: string | null;
	amount: number | null;
	member: MemberFields;
};

type TimelineProfile = {
	kind: 'profile_created';
	occurredAt: string;
	memberId: string;
	member: MemberFields;
};

type TimelinePending = {
	kind: 'membership_pending';
	occurredAt: string;
	memberId: string;
	membershipId: string;
	year: number;
	tier: string;
	expectedMembershipCents: number | null;
	sumMembershipPaid: number;
	member: MemberFields;
};

export type AdminActivityTimelineItem = TimelinePayment | TimelineProfile | TimelinePending;

/** Rolling window from now (timestamptz), matches intuitive “last 7 days”. */
const MEMBER_COUNT_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

function parseTimelineLimit(raw: string | null): number {
	const n = Math.floor(Number.parseInt(raw ?? '', 10));
	if (!Number.isFinite(n) || n < 1) return DEFAULT_TIMELINE_LIMIT;
	return Math.min(MAX_TIMELINE_LIMIT, n);
}

export const GET: APIRoute = async ({ request, cookies, url }) => {
	const auth = await requireAdminSession(request, cookies);
	if (!auth.ok) return auth.response;

	const service = createSupabaseServiceRoleClient();
	const year = getMembershipCalendarYear();
	const membersSince = new Date(Date.now() - MEMBER_COUNT_LOOKBACK_MS).toISOString();

	const searchParams = url.searchParams;
	const pageLimit = parseTimelineLimit(searchParams.get('limit'));
	const perSource = perSourceFetchLimit(pageLimit);
	const beforeRaw = searchParams.get('before')?.trim();
	let beforeIso: string | null = null;
	if (beforeRaw) {
		const d = new Date(beforeRaw);
		if (!Number.isNaN(d.getTime())) beforeIso = d.toISOString();
	}

	const [pendingRes, activeRes, payRes, profilesRes, pendingMsRes, members7dRes] = await Promise.all([
		service.from('memberships').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
		service
			.from('memberships')
			.select('id', { count: 'exact', head: true })
			.eq('year', year)
			.eq('status', 'active'),
		(() => {
			let q = service
				.from('payments')
				.select(
					`
          id,
          created_at,
          membership_amount,
          donation_amount,
          method,
          amount,
          memberships!inner (
            id,
            year,
            tier,
            member_id,
            members!inner (
              id,
              first_name,
              last_name,
              secondary_first_name,
              secondary_last_name,
              lake_civic_number,
              lake_street_name
            )
          )
        `,
				)
				.order('created_at', { ascending: false })
				.limit(perSource);
			if (beforeIso) q = q.lt('created_at', beforeIso);
			return q;
		})(),
		(() => {
			let q = service
				.from('members')
				.select(
					'id, created_at, first_name, last_name, secondary_first_name, secondary_last_name, lake_civic_number, lake_street_name',
				)
				.order('created_at', { ascending: false })
				.limit(perSource);
			if (beforeIso) q = q.lt('created_at', beforeIso);
			return q;
		})(),
		(() => {
			let q = service
				.from('memberships')
				.select('id, created_at, member_id, year, tier, status')
				.eq('status', 'pending')
				.order('created_at', { ascending: false })
				.limit(perSource);
			if (beforeIso) q = q.lt('created_at', beforeIso);
			return q;
		})(),
		service.from('members').select('id', { count: 'exact', head: true }).gte('created_at', membersSince),
	]);

	const err =
		pendingRes.error ||
		activeRes.error ||
		payRes.error ||
		profilesRes.error ||
		pendingMsRes.error ||
		members7dRes.error;
	if (err) {
		return new Response(JSON.stringify({ error: 'query_failed', detail: err.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const membersCreatedLastSevenDays = Math.max(0, Math.floor(Number(members7dRes.count ?? 0)) || 0);

	type PayEmbed = {
		year: number;
		tier: string;
		member_id: string;
		members: MemberFields | MemberFields[] | null;
	};

	const paymentRows = (payRes.data ?? []) as Array<{
		id: number;
		created_at: string;
		membership_amount: number | null;
		donation_amount: number | null;
		method: string | null;
		amount: number | null;
		memberships: PayEmbed | PayEmbed[] | null;
	}>;

	function pickMember(embed: PayEmbed): MemberFields | null {
		const raw = embed.members;
		const m = Array.isArray(raw) ? raw[0] : raw;
		return m ?? null;
	}

	const timelinePayments: TimelinePayment[] = paymentRows
		.map((r) => {
			const msRaw = r.memberships;
			const ms = Array.isArray(msRaw) ? msRaw[0] : msRaw;
			if (!ms) return null;
			const m = pickMember(ms);
			if (!m) return null;
			return {
				kind: 'payment' as const,
				occurredAt: r.created_at,
				memberId: m.id,
				paymentId: r.id,
				membershipYear: ms.year,
				tier: ms.tier,
				membershipAmount: r.membership_amount,
				donationAmount: r.donation_amount,
				method: r.method,
				amount: r.amount,
				member: m,
			};
		})
		.filter((x): x is TimelinePayment => x != null);

	const profileRows = (profilesRes.data ?? []) as Array<
		MemberFields & { created_at: string }
	>;
	const timelineProfiles: TimelineProfile[] = profileRows.map((m) => ({
		kind: 'profile_created' as const,
		occurredAt: m.created_at,
		memberId: m.id,
		member: {
			id: m.id,
			first_name: m.first_name,
			last_name: m.last_name,
			secondary_first_name: m.secondary_first_name,
			secondary_last_name: m.secondary_last_name,
			lake_civic_number: m.lake_civic_number,
			lake_street_name: m.lake_street_name,
		},
	}));

	const pendRows = (pendingMsRes.data ?? []) as Array<{
		id: string;
		created_at: string;
		member_id: string;
		year: number;
		tier: string;
	}>;

	const pendIds = pendRows.map((r) => r.id);
	let paidByMembership = new Map<string, number>();
	if (pendIds.length > 0) {
		const { data: payRows, error: payErr } = await service
			.from('payments')
			.select('membership_id, membership_amount')
			.in('membership_id', pendIds);
		if (payErr) {
			return new Response(JSON.stringify({ error: 'query_failed', detail: payErr.message }), {
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

	const pendMemberIds = [...new Set(pendRows.map((r) => r.member_id))];
	let memById = new Map<string, MemberFields>();
	if (pendMemberIds.length > 0) {
		const { data: mems, error: memErr } = await service
			.from('members')
			.select(
				'id, first_name, last_name, secondary_first_name, secondary_last_name, lake_civic_number, lake_street_name',
			)
			.in('id', pendMemberIds);
		if (memErr) {
			return new Response(JSON.stringify({ error: 'query_failed', detail: memErr.message }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		memById = new Map(
			(mems ?? []).map((m) => [
				m.id,
				m as MemberFields,
			]),
		);
	}

	const timelinePending: TimelinePending[] = pendRows
		.map((row) => {
			const member = memById.get(row.member_id);
			if (!member) return null;
			return {
				kind: 'membership_pending' as const,
				occurredAt: row.created_at,
				memberId: member.id,
				membershipId: row.id,
				year: row.year,
				tier: row.tier,
				expectedMembershipCents: membershipCentsForTier(row.tier),
				sumMembershipPaid: paidByMembership.get(row.id) ?? 0,
				member,
			};
		})
		.filter((x): x is TimelinePending => x != null);

	const merged: AdminActivityTimelineItem[] = [...timelinePayments, ...timelineProfiles, ...timelinePending].sort(
		(a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
	);
	const timeline = merged.slice(0, pageLimit);

	const payN = paymentRows.length;
	const profN = profileRows.length;
	const pendN = pendRows.length;
	const surplus = merged.length > pageLimit;
	const anySourceFull = payN >= perSource || profN >= perSource || pendN >= perSource;
	const hasMore = surplus || (timeline.length === pageLimit && anySourceFull);
	const nextBefore =
		hasMore && timeline.length > 0 ? timeline[timeline.length - 1]?.occurredAt ?? null : null;

	return new Response(
		JSON.stringify({
			timeline,
			counts: {
				pendingMemberships: pendingRes.count ?? 0,
				activeForYear: activeRes.count ?? 0,
				membershipYear: year,
				membersCreatedLastSevenDays,
			},
			pagination: {
				limit: pageLimit,
				hasMore,
				nextBefore,
			},
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
	);
};
