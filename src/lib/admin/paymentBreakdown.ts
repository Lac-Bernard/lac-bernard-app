import { membershipCentsForTier } from '../membership/stripeCheckout';

/** Parse donation amount from payment notes (Stripe webhook format). */
export function parseDonationDollarsFromNotes(notes: string | null | undefined): number | null {
	if (notes == null || notes === '') return null;
	const m =
		notes.match(/donation\s*\$\s*([0-9]+(?:\.[0-9]{1,2})?)\s*CAD/i) ??
		notes.match(/donation\s*\$\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
	if (!m) return null;
	const n = parseFloat(m[1]);
	return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export function expectedMembershipFeeDollars(tier: string): number | null {
	const c = membershipCentsForTier(tier);
	return c == null ? null : c / 100;
}

export type PaymentSplitInput = {
	amount: number | null;
	method: string | null;
	notes: string | null;
	membership_amount?: number | null;
	donation_amount?: number | null;
};

/** Split one payment into membership vs donation portions (best effort). Prefer stored columns when present. */
export function perPaymentMembershipDonation(
	p: PaymentSplitInput,
	tier: string,
): { membership: number; donation: number } {
	const ma = p.membership_amount;
	const da = p.donation_amount;
	if (
		ma != null &&
		da != null &&
		typeof ma === 'number' &&
		typeof da === 'number' &&
		Number.isFinite(ma) &&
		Number.isFinite(da)
	) {
		return { membership: ma, donation: da };
	}
	const amt = p.amount ?? 0;
	const fromNote = parseDonationDollarsFromNotes(p.notes);
	if (fromNote != null) {
		return {
			membership: Math.round((amt - fromNote) * 100) / 100,
			donation: fromNote,
		};
	}
	const fee = expectedMembershipFeeDollars(tier);
	if (p.method === 'stripe' && fee != null && amt > fee + 0.001) {
		return {
			membership: fee,
			donation: Math.round((amt - fee) * 100) / 100,
		};
	}
	return { membership: amt, donation: 0 };
}

/** Text after `Donation note:` in Stripe webhook notes, or structured column. */
export function parseDonationNoteSnippet(
	notes: string | null | undefined,
	donationNote?: string | null | undefined,
): string | null {
	const fromCol = donationNote?.trim();
	if (fromCol) return fromCol;
	if (notes == null || notes === '') return null;
	const m = notes.match(/Donation note:\s*(.+?)(?:\s*·\s*|$)/i);
	if (!m) return null;
	const t = m[1].trim();
	return t.length > 0 ? t : null;
}

export function sumYearPaymentBreakdown(
	payments: PaymentSplitInput[],
	tier: string,
): {
	totalPaid: number;
	membershipSubtotal: number;
	donationSubtotal: number;
	expectedFee: number | null;
} {
	let totalPaid = 0;
	let membershipSubtotal = 0;
	let donationSubtotal = 0;
	for (const p of payments) {
		const amt = p.amount ?? 0;
		totalPaid += amt;
		const { membership, donation } = perPaymentMembershipDonation(p, tier);
		membershipSubtotal += membership;
		donationSubtotal += donation;
	}
	return {
		totalPaid: Math.round(totalPaid * 100) / 100,
		membershipSubtotal: Math.round(membershipSubtotal * 100) / 100,
		donationSubtotal: Math.round(donationSubtotal * 100) / 100,
		expectedFee: expectedMembershipFeeDollars(tier),
	};
}
