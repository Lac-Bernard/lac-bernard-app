import type { SupabaseClient } from '@supabase/supabase-js';
import { findMemberByAuthEmail, type MemberProfile } from './memberLookup';

export type { MemberProfile };

export type MembershipStatus = 'pending' | 'active';

export type MembershipRow = {
	id: string;
	year: number;
	tier: string;
	status: MembershipStatus;
	complimentary: boolean;
	created_at: string;
};

/** Payment row for the member portal (`notes` is optional admin-entered text). */
export type MemberPaymentRow = {
	id: number;
	date: string | null;
	method: string | null;
	amount: number | null;
	membership_amount: number | null;
	donation_amount: number | null;
	donation_note: string | null;
	/** Earmark for the donation portion (environment/regatta/general); null if not set. */
	donation_category: string | null;
	/** Admin or system notes on the payment row (shown to the member when present). */
	notes: string | null;
	payment_id: string | null;
	/** Stripe processing fee in CAD (null if not Stripe or not recorded). */
	stripe_fee_cad: number | null;
	created_at: string;
};

export type MemberAccountPayload = {
	member: MemberProfile | null;
	currentMemberships: MembershipRow[];
	historicalMemberships: MembershipRow[];
	/** Payments for the current calendar year membership when that membership is active or pending; else []. */
	currentYearPayments: MemberPaymentRow[];
	/** Whether another current member already holds a voting membership at this member's lake address for `currentYear`. */
	votingAddressTaken: boolean;
};

export async function loadMemberAccountData(
	supabase: SupabaseClient,
	authEmail: string,
	currentYear: number,
): Promise<MemberAccountPayload> {
	const member = await findMemberByAuthEmail(supabase, authEmail);

	if (!member) {
		return {
			member: null,
			currentMemberships: [],
			historicalMemberships: [],
			currentYearPayments: [],
			votingAddressTaken: false,
		};
	}

	const { data: membershipRows, error: mErr } = await supabase
		.from('memberships')
		.select('id, year, tier, status, complimentary, created_at')
		.eq('member_id', member.id)
		.order('year', { ascending: false });

	if (mErr || !membershipRows) {
		return {
			member,
			currentMemberships: [],
			historicalMemberships: [],
			currentYearPayments: [],
			votingAddressTaken: false,
		};
	}

	const mapped: MembershipRow[] = membershipRows.map((r) => ({
		id: r.id,
		year: r.year,
		tier: r.tier,
		status: r.status === 'pending' ? 'pending' : 'active',
		complimentary: Boolean(r.complimentary),
		created_at: r.created_at,
	}));

	const currentMemberships = mapped
		.filter((m) => m.year === currentYear || m.year > currentYear)
		.sort((a, b) => a.year - b.year);
	const historicalMemberships = mapped.filter((m) => m.year < currentYear);

	const thisYear = mapped.find((m) => m.year === currentYear);

	let votingAddressTaken = false;
	if (!thisYear && member.lake_civic_number?.trim() && member.lake_street_name?.trim()) {
		const { data: elig } = await supabase.rpc('membership_voting_eligibility', {
			p_member_id: member.id,
			p_year: currentYear,
		});
		votingAddressTaken = (elig as { error?: string } | null)?.error === 'voting_address_taken';
	}

	let currentYearPayments: MemberPaymentRow[] = [];
	if (thisYear?.status === 'active' || thisYear?.status === 'pending') {
		const { data: payRows, error: pErr } = await supabase
			.from('payments')
			.select(
				'id, date, method, amount, membership_amount, donation_amount, donation_note, donation_category, notes, payment_id, stripe_fee_cad, created_at',
			)
			.eq('membership_id', thisYear.id);

		if (!pErr && payRows) {
			const rows: MemberPaymentRow[] = payRows.map((r) => ({
				id: r.id,
				date: r.date,
				method: r.method,
				amount: r.amount != null ? Number(r.amount) : null,
				membership_amount: r.membership_amount != null ? Number(r.membership_amount) : null,
				donation_amount: r.donation_amount != null ? Number(r.donation_amount) : null,
				donation_note: r.donation_note,
				donation_category: r.donation_category,
				notes: r.notes,
				payment_id: r.payment_id,
				stripe_fee_cad: r.stripe_fee_cad != null ? Number(r.stripe_fee_cad) : null,
				created_at: r.created_at,
			}));
			rows.sort((a, b) => {
				const da = a.date ?? '';
				const db = b.date ?? '';
				if (da !== db) return db.localeCompare(da);
				return b.created_at.localeCompare(a.created_at);
			});
			currentYearPayments = rows;
		}
	}

	return { member, currentMemberships, historicalMemberships, currentYearPayments, votingAddressTaken };
}
