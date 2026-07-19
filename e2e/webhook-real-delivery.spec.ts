import { test, expect } from '@playwright/test';
import { currentMembershipYear } from './support/env';
import {
	apiContextFor,
	createTestMember,
	deleteTestMember,
	grantAdminRole,
	serviceClient,
	type TestMember,
} from './support/testMember';
import { createRefundableTestPaymentIntent, stripeClient, waitForCondition } from './support/stripe';

let admin: TestMember;
let members: TestMember[] = [];

test.beforeAll(async () => {
	admin = await createTestMember({ firstName: 'Admin', lastName: 'E2E' });
	await grantAdminRole(admin.email);
});

test.afterAll(async () => {
	await deleteTestMember(admin);
	await Promise.all(members.map((m) => deleteTestMember(m)));
});

async function newMember(opts: Parameters<typeof createTestMember>[0] = {}): Promise<TestMember> {
	const m = await createTestMember(opts);
	members.push(m);
	return m;
}

/**
 * Unlike every other Stripe-touching spec (which self-signs synthetic webhook payloads via
 * `postSignedWebhookEvent` — see e2e/support/stripe.ts), this test triggers a real Stripe action
 * (a real refund on a real test-mode charge, issued directly against Stripe's API, not through our
 * own API) and asserts our DB only changes because Stripe's own servers delivered a genuinely
 * signed `charge.refunded` webhook — relayed through a locally-running Stripe webhook forwarder
 * (e.g. `stripe listen --forward-to localhost:4321/api/stripe-webhook`) to /api/stripe-webhook.
 *
 * That forwarder is a developer-machine convenience nothing else in the suite depends on, and
 * there's no CI to guarantee it's running, so this test must degrade gracefully: it polls briefly
 * for the expected side effect and skips (not fails) if it never arrives.
 *
 * checkout.session.completed (membership activation) can't get equivalent real-delivery coverage
 * without either driving Stripe's hosted Checkout UI (no precedent in this repo) or unreliable
 * `stripe trigger` fixture overrides — intentionally out of scope here; activation business logic
 * is covered via the self-signed webhook in webhook-fulfillment.spec.ts.
 */
test('a real Stripe refund reverses the membership via a genuinely Stripe-signed webhook', async () => {
	const supabaseAdmin = serviceClient();
	const stripe = stripeClient();
	const member = await newMember({ firstName: 'RealRefund', lastName: 'E2E' });
	const adminApi = await apiContextFor(admin.email);

	const msRes = await adminApi.post(`/api/admin/members/${member.memberId}/memberships`, {
		data: { year: currentMembershipYear(), tier: 'associate', initial: 'pending' },
	});
	expect(msRes.ok()).toBeTruthy();
	const { membership_id: membershipId } = await msRes.json();

	// Mirrors the precondition a real, paid membership would be in — we're deliberately not
	// driving checkout to get there (see file comment above), only exercising the reversal path.
	await supabaseAdmin.from('memberships').update({ status: 'active' }).eq('id', membershipId);

	const pi = await createRefundableTestPaymentIntent(2500);
	const { error: insertErr } = await supabaseAdmin.from('payments').insert({
		membership_id: membershipId,
		method: 'stripe',
		amount: 25,
		membership_amount: 25,
		donation_amount: 0,
		payment_id: pi.id,
	});
	expect(insertErr).toBeNull();

	// Issued directly against Stripe, bypassing our DELETE /payments route entirely — the only
	// path back to our DB is a real webhook Stripe delivers for this refund.
	await stripe.refunds.create({ payment_intent: pi.id });

	const delivered = await waitForCondition(async () => {
		const { data } = await supabaseAdmin
			.from('payments')
			.select('amount')
			.eq('membership_id', membershipId)
			.single();
		return data?.amount === 0;
	});

	if (!delivered) {
		await adminApi.dispose();
		test.skip(
			true,
			'Stripe webhook forwarder not detected relaying to /api/stripe-webhook within 5s — ' +
				'skipping real-delivery assertion. Run `stripe listen --forward-to ' +
				'localhost:4321/api/stripe-webhook` (with a matching STRIPE_WEBHOOK_SECRET in .env) ' +
				'to exercise this test.',
		);
		return;
	}

	const { data: paymentRow } = await supabaseAdmin
		.from('payments')
		.select('amount, membership_amount')
		.eq('membership_id', membershipId)
		.single();
	expect(paymentRow?.amount).toBe(0);
	expect(paymentRow?.membership_amount).toBe(0);

	const { data: membershipRow } = await supabaseAdmin
		.from('memberships')
		.select('status')
		.eq('id', membershipId)
		.single();
	expect(membershipRow?.status).toBe('pending');

	await adminApi.dispose();
});
