import { test, expect } from '@playwright/test';
import { apiContextFor, createTestMember, deleteTestMember, serviceClient, type TestMember } from './support/testMember';
import { completeStripeCheckout } from './support/stripe';

let member: TestMember;

test.beforeAll(async () => {
	member = await createTestMember({ firstName: 'Webhook', lastName: 'E2E' });
});

test.afterAll(async () => {
	await deleteTestMember(member);
});

test('checkout.session.completed webhook activates the membership and records the payment', async () => {
	// Sign in and create a pending membership through the real app APIs, so the checkout
	// session's metadata (membership_amount_cents, member_id, ...) matches what the webhook
	// handler expects — same contract the browser flow in membership-flow.spec.ts exercises.
	const supabaseAdmin = serviceClient();
	const api = await apiContextFor(member.email);

	const pendingRes = await api.post('/api/membership/create-pending', {
		data: { tier: 'associate' },
	});
	expect(pendingRes.ok()).toBeTruthy();
	const pendingBody = await pendingRes.json();
	const membershipId = pendingBody.id;
	expect(typeof membershipId).toBe('string');

	const { webhookRes } = await completeStripeCheckout(api, { membershipId });
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
