export const prerender = false;
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { fulfillMembershipFromCheckoutSession } from '../../lib/membership/fulfillStripeCheckoutSession';
import { getStripeSecretKey, getStripeWebhookSecret } from '../../lib/supabase/env';

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

	const outcome = await fulfillMembershipFromCheckoutSession(session);

	if (outcome.code === 'skip') {
		return new Response('ok', { status: 200 });
	}

	if (outcome.code === 'fulfilled') {
		return new Response('ok', { status: 200 });
	}

	if (outcome.code === 'rpc_failed') {
		return new Response('rpc error', { status: 500 });
	}

	return new Response('record failed', { status: 500 });
};
