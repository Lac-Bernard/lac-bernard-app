import { test, expect } from '@playwright/test';
import { apiContextFor, createTestMember, deleteTestMember, serviceClient, type TestMember } from './support/testMember';
import { buildEvent, completeStripeCheckout, postSignedWebhookEvent } from './support/stripe';

let members: TestMember[] = [];

test.afterEach(async () => {
	await Promise.all(members.map((m) => deleteTestMember(m)));
	members = [];
});

async function newMember(opts: Parameters<typeof createTestMember>[0] = {}): Promise<TestMember> {
	const m = await createTestMember(opts);
	members.push(m);
	return m;
}

test('a full refund zeroes the payment and reverses the membership back to pending', async () => {
	const supabaseAdmin = serviceClient();
	const member = await newMember({ firstName: 'Refund', lastName: 'E2E' });
	const api = await apiContextFor(member.email);

	const pendingRes = await api.post('/api/membership/create-pending', { data: { tier: 'associate' } });
	const { id: membershipId } = await pendingRes.json();

	const { webhookRes, paymentIntentId } = await completeStripeCheckout(api, { membershipId });
	expect(webhookRes.status()).toBe(200);
	const { data: activeRow } = await supabaseAdmin
		.from('memberships')
		.select('status')
		.eq('id', membershipId)
		.single();
	expect(activeRow?.status).toBe('active');

	// charge.refunded only needs amount/amount_refunded/payment_intent — the handler looks the
	// payment up by payment_intent id (recorded above), it never calls back out to Stripe for
	// this event type, so a fully synthetic Charge object is enough (no real charge required).
	const refundedCharge = {
		id: 'ch_test_fake',
		object: 'charge',
		amount: 2500,
		amount_refunded: 2500,
		currency: 'cad',
		payment_intent: paymentIntentId,
	};
	const refundRes = await postSignedWebhookEvent(api, buildEvent('charge.refunded', refundedCharge));
	expect(refundRes.status()).toBe(200);

	const { data: reversedRow } = await supabaseAdmin
		.from('memberships')
		.select('status')
		.eq('id', membershipId)
		.single();
	expect(reversedRow?.status).toBe('pending');

	const { data: paymentRows } = await supabaseAdmin
		.from('payments')
		.select('amount, membership_amount')
		.eq('membership_id', membershipId)
		.single();
	expect(paymentRows?.amount).toBe(0);
	expect(paymentRows?.membership_amount).toBe(0);

	await api.dispose();
});

test('redelivering the same checkout.session.completed webhook does not double-record the payment', async () => {
	const supabaseAdmin = serviceClient();
	const member = await newMember({ firstName: 'Dupe', lastName: 'E2E' });
	const api = await apiContextFor(member.email);

	const pendingRes = await api.post('/api/membership/create-pending', { data: { tier: 'associate' } });
	const { id: membershipId } = await pendingRes.json();

	const { webhookRes: firstRes, paymentIntentId } = await completeStripeCheckout(api, { membershipId });
	expect(firstRes.status()).toBe(200);

	// Stripe retries webhook delivery on timeout/5xx; record_stripe_payment is idempotent on the
	// payment_intent id, so re-sending the same logical event (fresh signature, same
	// payment_intent) must not create a second payments row.
	const dupeSession = {
		id: 'evt-dupe-check',
		object: 'checkout.session.completed',
		mode: 'payment',
		payment_status: 'paid',
		currency: 'cad',
		amount_total: 2500,
		payment_intent: paymentIntentId,
		metadata: {
			membership_id: membershipId,
			member_id: member.memberId,
			membership_amount_cents: '2500',
			donation_cents: '0',
			donation_note: '',
		},
	};
	const secondRes = await postSignedWebhookEvent(
		api,
		buildEvent('checkout.session.completed', dupeSession),
	);
	expect(secondRes.status()).toBe(200);

	const { data: paymentRows } = await supabaseAdmin
		.from('payments')
		.select('id')
		.eq('membership_id', membershipId);
	expect(paymentRows).toHaveLength(1);

	await api.dispose();
});

test('a dispute.closed event that is not lost leaves the membership untouched', async () => {
	const supabaseAdmin = serviceClient();
	const member = await newMember({ firstName: 'Dispute', lastName: 'E2E' });
	const api = await apiContextFor(member.email);

	const pendingRes = await api.post('/api/membership/create-pending', { data: { tier: 'associate' } });
	const { id: membershipId } = await pendingRes.json();
	const { webhookRes } = await completeStripeCheckout(api, { membershipId });
	expect(webhookRes.status()).toBe(200);

	// A "lost" dispute re-fetches the real charge from Stripe to find its payment_intent, which
	// needs a genuinely paid charge (out of scope here, same constraint as driving Stripe's
	// hosted checkout UI — see membership-flow.spec.ts). The non-lost path never calls Stripe, so
	// it's safe to exercise directly: it must be a no-op.
	const dispute = { id: 'dp_test_fake', object: 'dispute', status: 'needs_response', charge: 'ch_test_fake' };
	const disputeRes = await postSignedWebhookEvent(api, buildEvent('charge.dispute.closed', dispute));
	expect(disputeRes.status()).toBe(200);

	const { data: row } = await supabaseAdmin.from('memberships').select('status').eq('id', membershipId).single();
	expect(row?.status).toBe('active');

	await api.dispose();
});
