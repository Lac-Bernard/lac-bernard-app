export const prerender = false;
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getStripeSecretKey, getStripeWebhookSecret } from '../../lib/supabase/env';
import { createSupabaseServiceRoleClient } from '../../lib/supabase/service';

export const POST: APIRoute = async ({ request }) => {
	let stripe: Stripe;
	let webhookSecret: string;
	try {
		stripe = new Stripe(getStripeSecretKey());
		webhookSecret = getStripeWebhookSecret();
	} catch (e) {
		console.error('Stripe webhook misconfiguration:', e);
		return new Response('misconfigured', { status: 503 });
	}

	const signature = request.headers.get('stripe-signature');
	if (!signature) {
		return new Response('missing signature', { status: 400 });
	}

	const rawBody = await request.text();

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
	} catch (err) {
		console.error('Stripe webhook signature verification failed:', err);
		return new Response('invalid signature', { status: 400 });
	}

	if (event.type !== 'checkout.session.completed') {
		return new Response('ok', { status: 200 });
	}

	const session = event.data.object as Stripe.Checkout.Session;

	if (session.mode !== 'payment') {
		return new Response('ok', { status: 200 });
	}

	if (session.payment_status !== 'paid') {
		return new Response('ok', { status: 200 });
	}

	if (session.currency !== 'cad') {
		console.error('Stripe webhook: unexpected currency', session.currency);
		return new Response('ok', { status: 200 });
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
		console.error('Stripe webhook: missing metadata', metadata);
		return new Response('ok', { status: 200 });
	}

	const membershipCents = Number.parseInt(membershipCentsRaw, 10);
	const donationCents = Number.parseInt(donationCentsRaw, 10);
	if (!Number.isFinite(membershipCents) || !Number.isFinite(donationCents)) {
		console.error('Stripe webhook: invalid metadata amounts');
		return new Response('ok', { status: 200 });
	}

	const expectedTotal = membershipCents + donationCents;
	const amountTotal = session.amount_total ?? 0;
	if (amountTotal !== expectedTotal) {
		console.error('Stripe webhook: amount mismatch', {
			amountTotal,
			expectedTotal,
			sessionId: session.id,
		});
		return new Response('ok', { status: 200 });
	}

	const pi = session.payment_intent;
	const paymentIntentId = typeof pi === 'string' ? pi : pi?.id;
	if (!paymentIntentId) {
		console.error('Stripe webhook: missing payment_intent', session.id);
		return new Response('ok', { status: 200 });
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
			console.error('Stripe webhook: failed to set stripe_customer_id', custErr);
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
		console.error('Stripe webhook: record_stripe_payment failed', rpcError);
		return new Response('rpc error', { status: 500 });
	}

	const result = rpcResult as {
		ok?: boolean;
		error?: string;
		duplicate?: boolean;
	} | null;

	if (!result?.ok) {
		console.error('Stripe webhook: record_stripe_payment declined', result);
		return new Response('record failed', { status: 500 });
	}

	return new Response('ok', { status: 200 });
};
