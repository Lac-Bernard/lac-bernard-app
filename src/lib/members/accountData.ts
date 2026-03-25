import type { SupabaseClient } from '@supabase/supabase-js';
import { findMemberByAuthEmail, type MemberProfile } from './memberLookup';

export type { MemberProfile };

export type MembershipStatus = 'pending' | 'active';

export type MembershipRow = {
	id: string;
	year: number;
	tier: string;
	status: MembershipStatus;
	created_at: string;
};

export type MemberAccountPayload = {
	member: MemberProfile | null;
	currentMemberships: MembershipRow[];
	historicalMemberships: MembershipRow[];
};

export async function loadMemberAccountData(
	supabase: SupabaseClient,
	authEmail: string,
	currentYear: number,
): Promise<MemberAccountPayload> {
	const member = await findMemberByAuthEmail(supabase, authEmail);

	if (!member) {
		return { member: null, currentMemberships: [], historicalMemberships: [] };
	}

	const { data: membershipRows, error: mErr } = await supabase
		.from('memberships')
		.select('id, year, tier, status, created_at')
		.eq('member_id', member.id)
		.order('year', { ascending: false });

	if (mErr || !membershipRows) {
		return { member, currentMemberships: [], historicalMemberships: [] };
	}

	const mapped: MembershipRow[] = membershipRows.map((r) => ({
		id: r.id,
		year: r.year,
		tier: r.tier,
		status: r.status === 'pending' ? 'pending' : 'active',
		created_at: r.created_at,
	}));

	const currentMemberships = mapped
		.filter((m) => m.year === currentYear || m.year > currentYear)
		.sort((a, b) => a.year - b.year);
	const historicalMemberships = mapped.filter((m) => m.year < currentYear);

	return { member, currentMemberships, historicalMemberships };
}
