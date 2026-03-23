import type { SupabaseClient } from '@supabase/supabase-js';

export type MemberProfile = {
	id: string;
	first_name: string | null;
	last_name: string;
	primary_email: string | null;
	secondary_email: string | null;
};

export type MembershipRow = {
	id: string;
	year: number;
	tier: string;
	created_at: string;
};

export type MemberAccountPayload = {
	member: MemberProfile | null;
	currentMemberships: MembershipRow[];
	historicalMemberships: MembershipRow[];
};

/** Escape `%` and `_` so `ILIKE` matches the literal email. */
function escapeIlikeExact(value: string): string {
	return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}

export async function loadMemberAccountData(
	supabase: SupabaseClient,
	authEmail: string,
	currentYear: number,
): Promise<MemberAccountPayload> {
	const raw = authEmail.trim();
	if (!raw) {
		return { member: null, currentMemberships: [], historicalMemberships: [] };
	}

	const pattern = escapeIlikeExact(raw);

	const { data: primaryMatch, error: errPrimary } = await supabase
		.from('members')
		.select('id, first_name, last_name, primary_email, secondary_email')
		.ilike('primary_email', pattern)
		.limit(1)
		.maybeSingle();

	if (errPrimary) {
		return { member: null, currentMemberships: [], historicalMemberships: [] };
	}

	let member: MemberProfile | null = primaryMatch;

	if (!member) {
		const { data: secondaryMatch, error: errSecondary } = await supabase
			.from('members')
			.select('id, first_name, last_name, primary_email, secondary_email')
			.ilike('secondary_email', pattern)
			.limit(1)
			.maybeSingle();

		if (errSecondary) {
			return { member: null, currentMemberships: [], historicalMemberships: [] };
		}
		member = secondaryMatch ?? null;
	}

	if (!member) {
		return { member: null, currentMemberships: [], historicalMemberships: [] };
	}

	const { data: membershipRows, error: mErr } = await supabase
		.from('memberships')
		.select('id, year, tier, created_at')
		.eq('member_id', member.id)
		.order('year', { ascending: false });

	if (mErr || !membershipRows) {
		return { member, currentMemberships: [], historicalMemberships: [] };
	}

	const mapped: MembershipRow[] = membershipRows.map((r) => ({
		id: r.id,
		year: r.year,
		tier: r.tier,
		created_at: r.created_at,
	}));

	const currentMemberships = mapped
		.filter((m) => m.year === currentYear || m.year > currentYear)
		.sort((a, b) => a.year - b.year);
	const historicalMemberships = mapped.filter((m) => m.year < currentYear);

	return { member, currentMemberships, historicalMemberships };
}
