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
import { stripeClient } from './support/stripe';

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

/** Creates a real, immediately-succeeded test-mode PaymentIntent — no hosted Checkout UI needed. */
async function createRefundableTestPaymentIntent(amountCents: number) {
	const stripe = stripeClient();
	const pi = await stripe.paymentIntents.create({
		amount: amountCents,
		currency: 'cad',
		payment_method: 'pm_card_visa',
		confirm: true,
		automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
	});
	expect(pi.status).toBe('succeeded');
	return pi;
}

test('admin deletes a non-Stripe payment: row is removed and membership status resyncs', async () => {
	const supabaseAdmin = serviceClient();
	const member = await newMember({ firstName: 'DeleteCash', lastName: 'E2E' });
	const adminApi = await apiContextFor(admin.email);

	const msRes = await adminApi.post(`/api/admin/members/${member.memberId}/memberships`, {
		data: {
			year: currentMembershipYear(),
			tier: 'associate',
			initial: 'active_with_payment',
			payment: { amount: 25, method: 'cash' },
		},
	});
	expect(msRes.ok()).toBeTruthy();
	const { membership_id: membershipId, payment_id: paymentId } = await msRes.json();

	const { data: activeRow } = await supabaseAdmin
		.from('memberships')
		.select('status')
		.eq('id', membershipId)
		.single();
	expect(activeRow?.status).toBe('active');

	const delRes = await adminApi.delete(
		`/api/admin/members/${member.memberId}/payments/${paymentId}`,
	);
	expect(delRes.ok()).toBeTruthy();
	const delBody = await delRes.json();
	expect(delBody.membership_id).toBe(membershipId);

	const { data: payRows } = await supabaseAdmin.from('payments').select('id').eq('id', paymentId);
	expect(payRows).toHaveLength(0);

	const { data: revertedRow } = await supabaseAdmin
		.from('memberships')
		.select('status')
		.eq('id', membershipId)
		.single();
	expect(revertedRow?.status).toBe('pending');

	await adminApi.dispose();
});

test('admin deletes a Stripe payment: the charge is actually refunded and the row is removed', async () => {
	const supabaseAdmin = serviceClient();
	const stripe = stripeClient();
	const member = await newMember({ firstName: 'DeleteStripe', lastName: 'E2E' });
	const adminApi = await apiContextFor(admin.email);

	const msRes = await adminApi.post(`/api/admin/members/${member.memberId}/memberships`, {
		data: { year: currentMembershipYear(), tier: 'associate', initial: 'pending' },
	});
	expect(msRes.ok()).toBeTruthy();
	const { membership_id: membershipId } = await msRes.json();

	const pi = await createRefundableTestPaymentIntent(2500);
	const { data: inserted, error: insertErr } = await supabaseAdmin
		.from('payments')
		.insert({
			membership_id: membershipId,
			method: 'stripe',
			amount: 25,
			membership_amount: 25,
			donation_amount: 0,
			payment_id: pi.id,
		})
		.select('id')
		.single();
	expect(insertErr).toBeNull();
	const paymentId = inserted!.id as number;

	const delRes = await adminApi.delete(
		`/api/admin/members/${member.memberId}/payments/${paymentId}`,
	);
	expect(delRes.ok()).toBeTruthy();

	const { data: payRows } = await supabaseAdmin.from('payments').select('id').eq('id', paymentId);
	expect(payRows).toHaveLength(0);

	const refunds = await stripe.refunds.list({ payment_intent: pi.id });
	expect(refunds.data).toHaveLength(1);
	expect(refunds.data[0].status).toBe('succeeded');
	expect(refunds.data[0].amount).toBe(2500);

	await adminApi.dispose();
});

test('admin deleting a Stripe payment whose refund fails: row is kept, request 502s', async () => {
	const supabaseAdmin = serviceClient();
	const member = await newMember({ firstName: 'DeleteStripeFail', lastName: 'E2E' });
	const adminApi = await apiContextFor(admin.email);

	const msRes = await adminApi.post(`/api/admin/members/${member.memberId}/memberships`, {
		data: { year: currentMembershipYear(), tier: 'associate', initial: 'pending' },
	});
	expect(msRes.ok()).toBeTruthy();
	const { membership_id: membershipId } = await msRes.json();

	// A syntactically-plausible but nonexistent Payment Intent id — stripe.refunds.create rejects
	// this for real, exercising the failure path without needing a second live charge.
	const { data: inserted, error: insertErr } = await supabaseAdmin
		.from('payments')
		.insert({
			membership_id: membershipId,
			method: 'stripe',
			amount: 25,
			membership_amount: 25,
			donation_amount: 0,
			payment_id: 'pi_nonexistent_e2e_test',
		})
		.select('id')
		.single();
	expect(insertErr).toBeNull();
	const paymentId = inserted!.id as number;

	const delRes = await adminApi.delete(
		`/api/admin/members/${member.memberId}/payments/${paymentId}`,
	);
	expect(delRes.status()).toBe(502);
	const delBody = await delRes.json();
	expect(delBody.error).toBe('stripe_refund_failed');

	const { data: payRows } = await supabaseAdmin.from('payments').select('id').eq('id', paymentId);
	expect(payRows).toHaveLength(1);

	const { data: unchangedRow } = await supabaseAdmin
		.from('memberships')
		.select('status')
		.eq('id', membershipId)
		.single();
	expect(unchangedRow?.status).toBe('pending');

	await adminApi.dispose();
});

test('admin cannot delete a payment that belongs to a different member', async () => {
	const supabaseAdmin = serviceClient();
	const owner = await newMember({ firstName: 'PaymentOwner', lastName: 'E2E' });
	const otherMember = await newMember({ firstName: 'NotOwner', lastName: 'E2E' });
	const adminApi = await apiContextFor(admin.email);

	const msRes = await adminApi.post(`/api/admin/members/${owner.memberId}/memberships`, {
		data: {
			year: currentMembershipYear(),
			tier: 'associate',
			initial: 'active_with_payment',
			payment: { amount: 25, method: 'cash' },
		},
	});
	expect(msRes.ok()).toBeTruthy();
	const { payment_id: paymentId } = await msRes.json();

	const delRes = await adminApi.delete(
		`/api/admin/members/${otherMember.memberId}/payments/${paymentId}`,
	);
	expect(delRes.status()).toBe(404);

	const { data: payRows } = await supabaseAdmin.from('payments').select('id').eq('id', paymentId);
	expect(payRows).toHaveLength(1);

	await adminApi.dispose();
});
