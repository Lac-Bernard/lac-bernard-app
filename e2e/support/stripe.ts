import type { APIRequestContext, APIResponse } from '@playwright/test';
import Stripe from 'stripe';
import { e2eEnv } from './env';

export function stripeClient() {
	const { stripeSecretKey } = e2eEnv();
	return new Stripe(stripeSecretKey);
}

/** Extracts the `cs_test_…` / `cs_live_…` session id embedded in a hosted Checkout URL. */
export function sessionIdFromCheckoutUrl(url: string): string {
	const match = url.match(/cs_(test|live)_[A-Za-z0-9]+/);
	if (!match) throw new Error(`Could not find checkout session id in url: ${url}`);
	return match[0];
}

/** Signs `eventPayload` and POSTs it to `/api/stripe-webhook`, exactly as Stripe's servers would. */
export async function postSignedWebhookEvent(
	api: APIRequestContext,
	eventPayload: string,
): Promise<APIResponse> {
	const { stripeWebhookSecret } = e2eEnv();
	const signature = Stripe.webhooks.generateTestHeaderString({
		payload: eventPayload,
		secret: stripeWebhookSecret,
	});
	return api.post('/api/stripe-webhook', {
		data: eventPayload,
		headers: { 'content-type': 'application/json', 'stripe-signature': signature },
	});
}

function buildEvent(type: string, dataObject: unknown): string {
	return JSON.stringify({
		id: `evt_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		object: 'event',
		api_version: '2024-06-20',
		created: Math.floor(Date.now() / 1000),
		livemode: false,
		pending_webhooks: 0,
		request: { id: null, idempotency_key: null },
		type,
		data: { object: dataObject },
	});
}

/**
 * Drives a membership through Stripe Checkout end to end at the API layer: creates a real
 * (unpaid) Checkout Session via the app's own API, then simulates Stripe's
 * `checkout.session.completed` webhook the way Stripe's docs recommend testing webhooks — sign a
 * locally-built event with the webhook secret, rather than actually filling out Stripe's hosted
 * payment form (see membership-flow.spec.ts for the one test that drives the real UI up to the
 * checkout redirect).
 *
 * Stripe defers creating a PaymentIntent until the hosted page is opened, so `payment_intent` is
 * still null on the real (unpaid) session — we patch in a fake id along with `payment_status`.
 * Everything else (amount_total, currency, metadata, customer) comes from the real session Stripe
 * computed for this membership/tier/donation, so the webhook handler's amount/metadata checks are
 * exercised for real.
 */
export async function completeStripeCheckout(
	api: APIRequestContext,
	opts: { membershipId: string; donationDollars?: number; donationNote?: string; locale?: 'en' | 'fr' },
): Promise<{ webhookRes: APIResponse; paymentIntentId: string; sessionId: string }> {
	const stripe = stripeClient();

	const checkoutRes = await api.post('/api/membership/create-checkout-session', {
		data: {
			membershipId: opts.membershipId,
			donationDollars: opts.donationDollars ?? 0,
			donationNote: opts.donationNote ?? '',
			locale: opts.locale ?? 'en',
		},
	});
	if (!checkoutRes.ok()) {
		throw new Error(
			`create-checkout-session failed (${checkoutRes.status()}): ${await checkoutRes.text()}`,
		);
	}
	const { url } = await checkoutRes.json();
	const sessionId = sessionIdFromCheckoutUrl(url);

	const session = await stripe.checkout.sessions.retrieve(sessionId);
	const paymentIntentId = `pi_test_${sessionId}`;
	const paidSession = {
		...session,
		payment_status: 'paid' as const,
		payment_intent: paymentIntentId,
	};

	const webhookRes = await postSignedWebhookEvent(
		api,
		buildEvent('checkout.session.completed', paidSession),
	);
	return { webhookRes, paymentIntentId, sessionId };
}

/** Creates a real, immediately-succeeded test-mode PaymentIntent — no hosted Checkout UI needed. */
export async function createRefundableTestPaymentIntent(amountCents: number) {
	const stripe = stripeClient();
	const pi = await stripe.paymentIntents.create({
		amount: amountCents,
		currency: 'cad',
		payment_method: 'pm_card_visa',
		confirm: true,
		automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
	});
	if (pi.status !== 'succeeded') {
		throw new Error(`Expected test PaymentIntent to succeed, got status: ${pi.status}`);
	}
	return pi;
}

/**
 * Polls `check` until it resolves truthy or `timeoutMs` elapses. Used to detect whether a real,
 * externally-delivered side effect (e.g. a Stripe webhook relayed by a local forwarder) has
 * landed, without hard-failing when the forwarder isn't running — callers should treat a `false`
 * result as "skip", not "fail".
 */
export async function waitForCondition(
	check: () => Promise<boolean>,
	opts: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<boolean> {
	const timeoutMs = opts.timeoutMs ?? 5000;
	const intervalMs = opts.intervalMs ?? 500;
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		if (await check()) return true;
		if (Date.now() >= deadline) return false;
		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}
}

export { buildEvent };
