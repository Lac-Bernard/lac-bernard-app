import { createSupabaseServiceRoleClient } from '../supabase/service';

export type ZeroStripePaymentResult =
	| { ok: true; skipped?: boolean }
	| { ok: false; message: string };

/**
 * Zeros the stripe `payments` row for a Payment Intent and runs sync_membership_status_from_payments.
 * Used for full refunds and lost disputes. `not_found` is treated as success (webhook 200, not our row).
 */
export async function zeroStripePaymentAfterReversal(
	paymentIntentId: string,
): Promise<ZeroStripePaymentResult> {
	const id = paymentIntentId.trim();
	if (!id) {
		return { ok: false, message: 'invalid_id' };
	}

	const service = createSupabaseServiceRoleClient();
	const { data, error } = await service.rpc('zero_stripe_payment_after_reversal', {
		p_payment_intent_id: id,
	});

	if (error) {
		console.error('zero_stripe_payment_after_reversal RPC failed', error);
		return { ok: false, message: error.message };
	}

	const result = data as {
		ok?: boolean;
		skipped?: boolean;
		reason?: string;
		error?: string;
	} | null;

	if (result?.ok === false) {
		return { ok: false, message: result.error ?? 'rpc_declined' };
	}

	return { ok: true, skipped: Boolean(result?.skipped) };
}
