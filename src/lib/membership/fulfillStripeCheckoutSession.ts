import type Stripe from 'stripe';
import { createSupabaseServiceRoleClient } from '../supabase/service';

/**
 * Shared fulfillment for Stripe Checkout: idempotent payment row + activate membership.
 * Used by the Stripe webhook and the browser return URL handler.
 */
export type FulfillCheckoutSessionOutcome =
	| { code: 'fulfilled'; duplicate?: boolean }
	| { code: 'skip'; reason: string }
	| { code: 'rpc_failed'; message: string }
	| { code: 'rpc_declined'; result: unknown };

export async function fulfillMembershipFromCheckoutSession(
	session: Stripe.Checkout.Session,
): Promise<FulfillCheckoutSessionOutcome> {
	if (session.mode !== 'payment') {
		return { code: 'skip', reason: 'not_payment_mode' };
	}

	if (session.payment_status !== 'paid') {
		return { code: 'skip', reason: 'not_paid' };
	}

	if (session.currency !== 'cad') {
		console.error('Stripe checkout session: unexpected currency', session.currency);
		return { code: 'skip', reason: 'bad_currency' };
	}

	const metadata = session.metadata ?? {};
	const membershipId = metadata.membership_id;
	const memberId = metadata.member_id;
	const membershipCentsRaw = metadata.membership_amount_cents;
	const donationCentsRaw = metadata.donation_cents;

	if (
		typeof membershipId !== 'string' ||
		typeof memberId !== 'string' ||
		typeof membershipCentsRaw !== 'string' ||
		typeof donationCentsRaw !== 'string'
	) {
		console.error('Stripe checkout session: missing metadata', metadata);
		return { code: 'skip', reason: 'missing_metadata' };
	}

	const membershipCents = Number.parseInt(membershipCentsRaw, 10);
	const donationCents = Number.parseInt(donationCentsRaw, 10);
	if (!Number.isFinite(membershipCents) || !Number.isFinite(donationCents)) {
		console.error('Stripe checkout session: invalid metadata amounts');
		return { code: 'skip', reason: 'invalid_amounts' };
	}

	const expectedTotal = membershipCents + donationCents;
	const amountTotal = session.amount_total ?? 0;
	if (amountTotal !== expectedTotal) {
		console.error('Stripe checkout session: amount mismatch', {
			amountTotal,
			expectedTotal,
			sessionId: session.id,
		});
		return { code: 'skip', reason: 'amount_mismatch' };
	}

	const pi = session.payment_intent;
	const paymentIntentId = typeof pi === 'string' ? pi : pi?.id;
	if (!paymentIntentId) {
		console.error('Stripe checkout session: missing payment_intent', session.id);
		return { code: 'skip', reason: 'missing_payment_intent' };
	}

	const donationNoteRaw = metadata.donation_note;
	const donationNote =
		typeof donationNoteRaw === 'string' ? donationNoteRaw.trim() : '';

	const amountDollars = amountTotal / 100;
	const membershipDollars = Math.round(membershipCents) / 100;
	const donationDollars = Math.round(donationCents) / 100;
	const notesParts = [`Stripe Checkout`, `session ${session.id}`];
	if (donationCents > 0) {
		notesParts.push(`donation $${(donationCents / 100).toFixed(2)} CAD`);
	}
	if (donationNote.length > 0) {
		notesParts.push(`Donation note: ${donationNote}`);
	}
	const notes = notesParts.join(' · ');

	const service = createSupabaseServiceRoleClient();

	const customerId = session.customer;
	if (typeof customerId === 'string' && customerId) {
		const { error: custErr } = await service
			.from('members')
			.update({ stripe_customer_id: customerId })
			.eq('id', memberId)
			.is('stripe_customer_id', null);
		if (custErr) {
			console.error('Stripe checkout session: failed to set stripe_customer_id', custErr);
		}
	}

	const { data: rpcResult, error: rpcError } = await service.rpc('record_stripe_payment', {
		p_membership_id: membershipId,
		p_amount: amountDollars,
		p_membership_amount: membershipDollars,
		p_donation_amount: donationDollars,
		p_stripe_payment_id: paymentIntentId,
		p_notes: notes,
		p_donation_note: donationNote.length > 0 ? donationNote : null,
	});

	if (rpcError) {
		console.error('Stripe checkout session: record_stripe_payment failed', rpcError);
		return { code: 'rpc_failed', message: rpcError.message };
	}

	const result = rpcResult as {
		ok?: boolean;
		error?: string;
		duplicate?: boolean;
	} | null;

	if (!result?.ok) {
		console.error('Stripe checkout session: record_stripe_payment declined', result);
		return { code: 'rpc_declined', result };
	}

	return { code: 'fulfilled', duplicate: Boolean(result.duplicate) };
}
