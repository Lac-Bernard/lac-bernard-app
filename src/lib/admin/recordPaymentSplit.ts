import { membershipCentsForTier } from '../membership/stripeCheckout';
import { computeManualPaymentSplit, roundMoney } from './manualPaymentSplit';

function tierFeeDollars(tier: string): number | null {
	const c = membershipCentsForTier(tier);
	return c == null ? null : c / 100;
}

export type RecordPaymentSplitResult =
	| { ok: true; membershipAmount: number; donationAmount: number }
	| { ok: false; error: 'membership_overpay' | 'dues_only_when_pending' | 'split_mismatch' };

/**
 * Split a manual payment into membership vs donation.
 * If `donationPortion` is null/undefined, uses automatic split (dues first, remainder donation).
 * Otherwise `donationPortion` is the intended donation amount (clamped to [0, amount]).
 */
export function computeRecordPaymentSplit(input: {
	amount: number;
	tier: string;
	membershipStatus: string;
	sumMembershipPaid: number;
	donationPortion?: number | null;
}): RecordPaymentSplitResult {
	const amount = roundMoney(input.amount);
	if (input.donationPortion == null || Number.isNaN(input.donationPortion)) {
		const s = computeManualPaymentSplit({
			amount,
			tier: input.tier,
			membershipStatus: input.membershipStatus,
			sumMembershipPaid: input.sumMembershipPaid,
		});
		return { ok: true, membershipAmount: s.membershipAmount, donationAmount: s.donationAmount };
	}

	const donationAmount = roundMoney(Math.max(0, Math.min(amount, input.donationPortion)));
	const membershipAmount = roundMoney(amount - donationAmount);
	const total = roundMoney(membershipAmount + donationAmount);
	if (Math.abs(total - amount) > 0.001) {
		return { ok: false, error: 'split_mismatch' };
	}

	if (input.membershipStatus !== 'pending' && membershipAmount > 0.001) {
		return { ok: false, error: 'dues_only_when_pending' };
	}

	const fee = tierFeeDollars(input.tier);
	const paid = roundMoney(input.sumMembershipPaid);
	if (fee != null && input.membershipStatus === 'pending') {
		const remaining = roundMoney(Math.max(0, fee - paid));
		if (membershipAmount > remaining + 0.001) {
			return { ok: false, error: 'membership_overpay' };
		}
	}

	return { ok: true, membershipAmount, donationAmount };
}
