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

/** Payment row for the member portal (`notes` is optional admin-entered text). */
export type MemberPaymentRow = {
	id: number;
	date: string | null;
	method: string | null;
	amount: number | null;
	membership_amount: number | null;
	donation_amount: number | null;
	donation_note: string | null;
	/** Admin or system notes on the payment row (shown to the member when present). */
	notes: string | null;
	payment_id: string | null;
	created_at: string;
};

export type MemberAccountPayload = {
	member: MemberProfile | null;
	currentMemberships: MembershipRow[];
	historicalMemberships: MembershipRow[];
	/** Payments for the current calendar year membership when that membership is active; else []. */
	currentYearPayments: MemberPaymentRow[];
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
		};
	}

	const { data: membershipRows, error: mErr } = await supabase
		.from('memberships')
		.select('id, year, tier, status, created_at')
		.eq('member_id', member.id)
		.order('year', { ascending: false });

	if (mErr || !membershipRows) {
		return {
			member,
			currentMemberships: [],
			historicalMemberships: [],
			currentYearPayments: [],
		};
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

	const thisYear = mapped.find((m) => m.year === currentYear);
	let currentYearPayments: MemberPaymentRow[] = [];
	if (thisYear?.status === 'active') {
		const { data: payRows, error: pErr } = await supabase
			.from('payments')
			.select(
				'id, date, method, amount, membership_amount, donation_amount, donation_note, notes, payment_id, created_at',
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
				notes: r.notes,
				payment_id: r.payment_id,
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

	return { member, currentMemberships, historicalMemberships, currentYearPayments };
}
