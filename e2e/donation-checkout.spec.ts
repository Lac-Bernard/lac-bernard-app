import { test, expect } from '@playwright/test';
import { apiContextFor, createTestMember, deleteTestMember, serviceClient, type TestMember } from './support/testMember';
import { completeStripeCheckout } from './support/stripe';

let member: TestMember;

test.beforeAll(async () => {
	member = await createTestMember({ firstName: 'Donation', lastName: 'E2E' });
});

test.afterAll(async () => {
	await deleteTestMember(member);
});

test('a member can include a donation alongside their membership payment', async () => {
	const supabaseAdmin = serviceClient();
	const api = await apiContextFor(member.email);

	const pendingRes = await api.post('/api/membership/create-pending', { data: { tier: 'associate' } });
	const { id: membershipId } = await pendingRes.json();

	const { webhookRes } = await completeStripeCheckout(api, {
		membershipId,
		donationDollars: 10,
		donationNote: 'For the loons',
	});
	expect(webhookRes.status()).toBe(200);

	const { data: membershipRow } = await supabaseAdmin
		.from('memberships')
		.select('status')
		.eq('id', membershipId)
		.single();
	expect(membershipRow?.status).toBe('active');

	const { data: paymentRows } = await supabaseAdmin
		.from('payments')
		.select('amount, membership_amount, donation_amount, donation_note')
		.eq('membership_id', membershipId);
	expect(paymentRows).toHaveLength(1);
	const payment = paymentRows?.[0];
	expect(payment?.membership_amount).toBe(25);
	expect(payment?.donation_amount).toBe(10);
	expect(payment?.amount).toBe(35);
	expect(payment?.donation_note).toBe('For the loons');

	await api.dispose();
});
