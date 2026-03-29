import { membershipCentsForTier } from '../membership/stripeCheckout';

export function roundMoney(n: number): number {
	return Math.round(n * 100) / 100;
}

function tierFeeDollars(tier: string): number | null {
	const c = membershipCentsForTier(tier);
	return c == null ? null : c / 100;
}

/**
 * Split a single manual payment into dues vs donation: apply to remaining tier fee first, remainder donation.
 * Active membership (or dues already fully paid) → all donation.
 */
export function computeManualPaymentSplit(input: {
	amount: number;
	tier: string;
	membershipStatus: string;
	sumMembershipPaid: number;
}): { membershipAmount: number; donationAmount: number } {
	const fee = tierFeeDollars(input.tier);
	const amount = roundMoney(input.amount);
	if (fee == null) {
		return { membershipAmount: amount, donationAmount: 0 };
	}
	const paid = roundMoney(input.sumMembershipPaid);
	const remainingDue = roundMoney(Math.max(0, fee - paid));
	if (input.membershipStatus === 'active' || remainingDue <= 0) {
		return { membershipAmount: 0, donationAmount: amount };
	}
	const membershipAmount = roundMoney(Math.min(amount, remainingDue));
	const donationAmount = roundMoney(amount - membershipAmount);
	return { membershipAmount, donationAmount };
}
