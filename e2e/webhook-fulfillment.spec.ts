import { test, expect, request as playwrightRequest } from '@playwright/test';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { e2eEnv } from './support/env';
import { createTestMember, deleteTestMember, sessionCookieHeader, type TestMember } from './support/testMember';

let member: TestMember;
let membershipId: string;

function serviceClient() {
	const { supabaseUrl, supabaseServiceRoleKey } = e2eEnv();
	return createClient(supabaseUrl, supabaseServiceRoleKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
}

/** Extracts the `cs_test_…` / `cs_live_…` session id embedded in a hosted Checkout URL. */
function sessionIdFromCheckoutUrl(url: string): string {
	const match = url.match(/cs_(test|live)_[A-Za-z0-9]+/);
	if (!match) throw new Error(`Could not find checkout session id in url: ${url}`);
	return match[0];
}

test.beforeAll(async () => {
	member = await createTestMember({ firstName: 'Webhook', lastName: 'E2E' });
});

test.afterAll(async () => {
	await deleteTestMember(member);
});

test('checkout.session.completed webhook activates the membership and records the payment', async () => {
	const { baseURL, stripeSecretKey, stripeWebhookSecret } = e2eEnv();
	const stripe = new Stripe(stripeSecretKey);

	// Sign in and create a pending membership through the real app APIs, so the checkout
	// session's metadata (membership_amount_cents, member_id, ...) matches what the webhook
	// handler expects — same contract the browser flow in membership-flow.spec.ts exercises.
	const supabaseAdmin = serviceClient();
	const cookie = await sessionCookieHeader(member.email);
	const api = await playwrightRequest.newContext({ baseURL, extraHTTPHeaders: { cookie } });

	const pendingRes = await api.post('/api/membership/create-pending', {
		data: { tier: 'associate' },
	});
	expect(pendingRes.ok()).toBeTruthy();
	const pendingBody = await pendingRes.json();
	membershipId = pendingBody.id;
	expect(typeof membershipId).toBe('string');

	const checkoutRes = await api.post('/api/membership/create-checkout-session', {
		data: { membershipId, donationDollars: 0, donationNote: '', locale: 'en' },
	});
	expect(checkoutRes.ok()).toBeTruthy();
	const checkoutBody = await checkoutRes.json();
	const sessionId = sessionIdFromCheckoutUrl(checkoutBody.url);

	// The session is real but unpaid (nobody filled out Stripe's hosted form), and Stripe
	// defers creating a PaymentIntent until the hosted page is actually opened, so
	// `payment_intent` is still null too. Fetch the canonical object for its real
	// amount/currency/metadata, then patch in what a completed payment would have set, and sign
	// the event the same way `stripe listen`/Stripe's servers would — this is the pattern
	// Stripe's own docs recommend for webhook tests.
	const session = await stripe.checkout.sessions.retrieve(sessionId);
	const paidSession = {
		...session,
		payment_status: 'paid' as const,
		payment_intent: `pi_test_${session.id}`,
	};

	const eventPayload = JSON.stringify({
		id: `evt_test_${Date.now()}`,
		object: 'event',
		api_version: '2024-06-20',
		created: Math.floor(Date.now() / 1000),
		livemode: false,
		pending_webhooks: 0,
		request: { id: null, idempotency_key: null },
		type: 'checkout.session.completed',
		data: { object: paidSession },
	});

	const signature = Stripe.webhooks.generateTestHeaderString({
		payload: eventPayload,
		secret: stripeWebhookSecret,
	});

	const webhookRes = await api.post('/api/stripe-webhook', {
		data: eventPayload,
		headers: { 'content-type': 'application/json', 'stripe-signature': signature },
	});
	expect(webhookRes.status()).toBe(200);

	const { data: membershipRow } = await supabaseAdmin
		.from('memberships')
		.select('status, activated_at')
		.eq('id', membershipId)
		.single();
	expect(membershipRow?.status).toBe('active');
	expect(membershipRow?.activated_at).toBeTruthy();

	const { data: paymentRows } = await supabaseAdmin
		.from('payments')
		.select('method, payment_id, amount')
		.eq('membership_id', membershipId);
	expect(paymentRows).toHaveLength(1);
	expect(paymentRows?.[0].method).toBe('stripe');

	await api.dispose();
});
