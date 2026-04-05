export const prerender = false;
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { fulfillMembershipFromCheckoutSession } from '../../lib/membership/fulfillStripeCheckoutSession';
import { zeroStripePaymentAfterReversal } from '../../lib/membership/zeroStripePaymentAfterReversal';
import { getStripeSecretKey, getStripeWebhookSecret } from '../../lib/supabase/env';

function paymentIntentIdFromCharge(charge: Stripe.Charge): string | null {
	const pi = charge.payment_intent;
	if (typeof pi === 'string') return pi;
	if (pi && typeof pi === 'object' && 'id' in pi) return pi.id;
	return null;
}

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

	switch (event.type) {
		case 'checkout.session.completed': {
			const session = event.data.object as Stripe.Checkout.Session;
			const outcome = await fulfillMembershipFromCheckoutSession(session);

			if (outcome.code === 'skip' || outcome.code === 'fulfilled') {
				return new Response('ok', { status: 200 });
			}
			if (outcome.code === 'rpc_failed') {
				return new Response('rpc error', { status: 500 });
			}
			return new Response('record failed', { status: 500 });
		}

		case 'charge.refunded': {
			const charge = event.data.object as Stripe.Charge;
			if (charge.amount_refunded !== charge.amount) {
				if (charge.amount_refunded < charge.amount) {
					console.info(
						'charge.refunded: partial refund ignored (manual follow-up)',
						charge.id,
					);
				} else {
					console.warn(
						'charge.refunded: amount_refunded !== amount (unexpected)',
						charge.id,
					);
				}
				return new Response('ok', { status: 200 });
			}

			const piId = paymentIntentIdFromCharge(charge);
			if (!piId) {
				console.warn('charge.refunded: no payment_intent on charge', charge.id);
				return new Response('ok', { status: 200 });
			}

			const result = await zeroStripePaymentAfterReversal(piId);
			if (!result.ok) {
				return new Response('reversal failed', { status: 500 });
			}
			return new Response('ok', { status: 200 });
		}

		case 'charge.dispute.closed': {
			const dispute = event.data.object as Stripe.Dispute;
			if (dispute.status !== 'lost') {
				return new Response('ok', { status: 200 });
			}

			const chargeId =
				typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
			if (!chargeId) {
				console.warn('charge.dispute.closed (lost): no charge id', dispute.id);
				return new Response('ok', { status: 200 });
			}

			let ch: Stripe.Charge;
			try {
				ch = await stripe.charges.retrieve(chargeId);
			} catch (e) {
				console.error('charge.dispute.closed: charges.retrieve failed', e);
				return new Response('stripe retrieve failed', { status: 500 });
			}

			const piId = paymentIntentIdFromCharge(ch);
			if (!piId) {
				console.warn(
					'charge.dispute.closed (lost): no payment_intent on charge',
					chargeId,
				);
				return new Response('ok', { status: 200 });
			}

			const result = await zeroStripePaymentAfterReversal(piId);
			if (!result.ok) {
				return new Response('reversal failed', { status: 500 });
			}
			return new Response('ok', { status: 200 });
		}

		default:
			return new Response('ok', { status: 200 });
	}
};
