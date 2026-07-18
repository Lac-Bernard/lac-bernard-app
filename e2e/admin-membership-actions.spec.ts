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
import {
	buildEvent,
	completeStripeCheckout,
	postSignedWebhookEvent,
	sessionIdFromCheckoutUrl,
	stripeClient,
} from './support/stripe';

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

test('admin can grant a complimentary membership and it shows as active', async () => {
	const supabaseAdmin = serviceClient();
	const member = await newMember({ firstName: 'Comp', lastName: 'E2E' });
	const adminApi = await apiContextFor(admin.email);

	const res = await adminApi.post(`/api/admin/members/${member.memberId}/memberships`, {
		data: { year: currentMembershipYear(), tier: 'associate', initial: 'complimentary' },
	});
	expect(res.ok()).toBeTruthy();
	const body = await res.json();
	expect(typeof body.membership_id).toBe('string');

	const { data: row } = await supabaseAdmin
		.from('memberships')
		.select('status, complimentary')
		.eq('id', body.membership_id)
		.single();
	expect(row?.status).toBe('active');
	expect(row?.complimentary).toBe(true);

	await adminApi.dispose();
});

test('admin can create a member', async () => {
	const supabaseAdmin = serviceClient();
	const adminApi = await apiContextFor(admin.email);
	const email = `e2e-admincreate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

	const res = await adminApi.post('/api/admin/members', {
		data: { first_name: 'AdminCreated', last_name: 'E2E', primary_email: email },
	});
	expect(res.ok()).toBeTruthy();
	const body = await res.json();
	expect(typeof body.member?.id).toBe('string');
	members.push({ email, memberId: body.member.id });

	const { data: row } = await supabaseAdmin
		.from('members')
		.select('first_name, last_name, primary_email, status')
		.eq('id', body.member.id)
		.single();
	expect(row?.first_name).toBe('AdminCreated');
	expect(row?.last_name).toBe('E2E');
	expect(row?.primary_email).toBe(email);
	expect(row?.status).toBe('enrolled');

	await adminApi.dispose();
});

test('admin creates a member and then adds a membership for them', async () => {
	const supabaseAdmin = serviceClient();
	const adminApi = await apiContextFor(admin.email);
	const email = `e2e-admincreate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

	const memberRes = await adminApi.post('/api/admin/members', {
		data: { first_name: 'AdminCreatedWithMembership', last_name: 'E2E', primary_email: email },
	});
	expect(memberRes.ok()).toBeTruthy();
	const { member } = await memberRes.json();
	members.push({ email, memberId: member.id });

	const membershipRes = await adminApi.post(`/api/admin/members/${member.id}/memberships`, {
		data: {
			year: currentMembershipYear(),
			tier: 'associate',
			initial: 'active_with_payment',
			payment: { amount: 25, method: 'cash' },
		},
	});
	expect(membershipRes.ok()).toBeTruthy();
	const membershipBody = await membershipRes.json();
	expect(typeof membershipBody.membership_id).toBe('string');
	expect(typeof membershipBody.payment_id).toBe('number');

	const { data: row } = await supabaseAdmin
		.from('memberships')
		.select('status, complimentary, member_id')
		.eq('id', membershipBody.membership_id)
		.single();
	expect(row?.member_id).toBe(member.id);
	expect(row?.status).toBe('active');
	expect(row?.complimentary).toBe(false);

	await adminApi.dispose();
});

test('admin adds a membership with a full payment to an existing member, activating it', async () => {
	const supabaseAdmin = serviceClient();
	const member = await newMember({ firstName: 'AdminPaid', lastName: 'E2E' });
	const adminApi = await apiContextFor(admin.email);

	const res = await adminApi.post(`/api/admin/members/${member.memberId}/memberships`, {
		data: {
			year: currentMembershipYear(),
			tier: 'associate',
			initial: 'active_with_payment',
			payment: { amount: 25, method: 'e-transfer', notes: 'e2e admin-recorded payment' },
		},
	});
	expect(res.ok()).toBeTruthy();
	const body = await res.json();
	expect(typeof body.membership_id).toBe('string');
	expect(typeof body.payment_id).toBe('number');

	const { data: row } = await supabaseAdmin
		.from('memberships')
		.select('status, complimentary')
		.eq('id', body.membership_id)
		.single();
	expect(row?.status).toBe('active');
	expect(row?.complimentary).toBe(false);

	const { data: payRows } = await supabaseAdmin
		.from('payments')
		.select('method, amount, membership_amount, donation_amount, notes')
		.eq('membership_id', body.membership_id);
	expect(payRows).toHaveLength(1);
	expect(payRows?.[0].method).toBe('e-transfer');
	expect(Number(payRows?.[0].amount)).toBe(25);
	expect(Number(payRows?.[0].membership_amount)).toBe(25);
	expect(Number(payRows?.[0].donation_amount)).toBe(0);
	expect(payRows?.[0].notes).toBe('e2e admin-recorded payment');

	await adminApi.dispose();
});

test('admin adds a pending membership to an existing member, leaving it unpaid', async () => {
	const supabaseAdmin = serviceClient();
	const member = await newMember({ firstName: 'AdminPending', lastName: 'E2E' });
	const adminApi = await apiContextFor(admin.email);

	const res = await adminApi.post(`/api/admin/members/${member.memberId}/memberships`, {
		data: { year: currentMembershipYear(), tier: 'associate', initial: 'pending' },
	});
	expect(res.ok()).toBeTruthy();
	const body = await res.json();
	expect(typeof body.membership_id).toBe('string');
	expect(body.payment_id).toBeUndefined();

	const { data: row } = await supabaseAdmin
		.from('memberships')
		.select('status, complimentary')
		.eq('id', body.membership_id)
		.single();
	expect(row?.status).toBe('pending');
	expect(row?.complimentary).toBe(false);

	const { data: payRows } = await supabaseAdmin.from('payments').select('id').eq('membership_id', body.membership_id);
	expect(payRows).toHaveLength(0);

	await adminApi.dispose();
});

test('admin converts a pending membership into a complimentary one', async () => {
	const supabaseAdmin = serviceClient();
	const member = await newMember({ firstName: 'PendingComp', lastName: 'E2E' });
	const memberApi = await apiContextFor(member.email);
	const adminApi = await apiContextFor(admin.email);

	const pendingRes = await memberApi.post('/api/membership/create-pending', { data: { tier: 'associate' } });
	expect(pendingRes.ok()).toBeTruthy();
	const { id: membershipId } = await pendingRes.json();

	const { data: pendingRow } = await supabaseAdmin
		.from('memberships')
		.select('status, complimentary')
		.eq('id', membershipId)
		.single();
	expect(pendingRow?.status).toBe('pending');
	expect(pendingRow?.complimentary).toBe(false);

	const compRes = await adminApi.post(`/api/admin/memberships/${membershipId}/make-complimentary`);
	expect(compRes.ok()).toBeTruthy();

	const { data: compRow } = await supabaseAdmin
		.from('memberships')
		.select('status, complimentary')
		.eq('id', membershipId)
		.single();
	expect(compRow?.status).toBe('active');
	expect(compRow?.complimentary).toBe(true);

	const retryRes = await adminApi.post(`/api/admin/memberships/${membershipId}/make-complimentary`);
	expect(retryRes.status()).toBe(409);
	const retryBody = await retryRes.json();
	expect(retryBody.error).toBe('not_pending');

	await memberApi.dispose();
	await adminApi.dispose();
});

test('admin removes complimentary status from a membership, reverting it to pending', async () => {
	const supabaseAdmin = serviceClient();
	const member = await newMember({ firstName: 'UndoComp', lastName: 'E2E' });
	const memberApi = await apiContextFor(member.email);
	const adminApi = await apiContextFor(admin.email);

	const pendingRes = await memberApi.post('/api/membership/create-pending', { data: { tier: 'associate' } });
	expect(pendingRes.ok()).toBeTruthy();
	const { id: membershipId } = await pendingRes.json();

	const compRes = await adminApi.post(`/api/admin/memberships/${membershipId}/make-complimentary`);
	expect(compRes.ok()).toBeTruthy();

	const { data: compRow } = await supabaseAdmin
		.from('memberships')
		.select('status, complimentary')
		.eq('id', membershipId)
		.single();
	expect(compRow?.status).toBe('active');
	expect(compRow?.complimentary).toBe(true);

	const removeRes = await adminApi.post(`/api/admin/memberships/${membershipId}/remove-complimentary`);
	expect(removeRes.ok()).toBeTruthy();

	const { data: revertedRow } = await supabaseAdmin
		.from('memberships')
		.select('status, complimentary')
		.eq('id', membershipId)
		.single();
	// No payments were recorded while complimentary, so it reverts to pending rather than active.
	expect(revertedRow?.status).toBe('pending');
	expect(revertedRow?.complimentary).toBe(false);

	const retryRes = await adminApi.post(`/api/admin/memberships/${membershipId}/remove-complimentary`);
	expect(retryRes.status()).toBe(409);
	const retryBody = await retryRes.json();
	expect(retryBody.error).toBe('not_complimentary');

	await memberApi.dispose();
	await adminApi.dispose();
});

test('a Stripe payment that lands after a membership is made complimentary is still recorded', async () => {
	const supabaseAdmin = serviceClient();
	const member = await newMember({ firstName: 'RaceComp', lastName: 'E2E' });
	const memberApi = await apiContextFor(member.email);
	const adminApi = await apiContextFor(admin.email);

	const pendingRes = await memberApi.post('/api/membership/create-pending', { data: { tier: 'associate' } });
	expect(pendingRes.ok()).toBeTruthy();
	const { id: membershipId } = await pendingRes.json();

	// Member opens checkout while the membership is still pending (allowed only for pending rows).
	const checkoutRes = await memberApi.post('/api/membership/create-checkout-session', {
		data: { membershipId, donationDollars: 0, donationNote: '', locale: 'en' },
	});
	expect(checkoutRes.ok()).toBeTruthy();
	const { url } = await checkoutRes.json();
	const sessionId = sessionIdFromCheckoutUrl(url);

	// Admin makes it complimentary before the charge settles → membership is now active + complimentary.
	const compRes = await adminApi.post(`/api/admin/memberships/${membershipId}/make-complimentary`);
	expect(compRes.ok()).toBeTruthy();

	// The charge settles and Stripe fires the webhook against the now-complimentary membership.
	const stripe = stripeClient();
	const session = await stripe.checkout.sessions.retrieve(sessionId);
	const paidSession = {
		...session,
		payment_status: 'paid' as const,
		payment_intent: `pi_test_${sessionId}`,
	};
	const webhookRes = await postSignedWebhookEvent(
		memberApi,
		buildEvent('checkout.session.completed', paidSession),
	);
	expect(webhookRes.status()).toBe(200);

	// The payment is captured rather than dropped, and the membership stays complimentary + active.
	const { data: payRows } = await supabaseAdmin
		.from('payments')
		.select('membership_amount')
		.eq('membership_id', membershipId);
	expect(payRows).toHaveLength(1);

	const { data: row } = await supabaseAdmin
		.from('memberships')
		.select('status, complimentary')
		.eq('id', membershipId)
		.single();
	expect(row?.status).toBe('active');
	expect(row?.complimentary).toBe(true);

	await memberApi.dispose();
	await adminApi.dispose();
});

test('admin can record a donation on a complimentary membership without disturbing its status', async () => {
	const supabaseAdmin = serviceClient();
	const member = await newMember({ firstName: 'CompDonation', lastName: 'E2E' });
	const adminApi = await apiContextFor(admin.email);

	const createRes = await adminApi.post(`/api/admin/members/${member.memberId}/memberships`, {
		data: { year: currentMembershipYear(), tier: 'associate', initial: 'complimentary' },
	});
	expect(createRes.ok()).toBeTruthy();
	const { membership_id: membershipId } = await createRes.json();

	const recordRes = await adminApi.post(`/api/admin/memberships/${membershipId}/record-payment`, {
		data: { amount: 40, method: 'cheque', notes: 'e2e comp donation' },
	});
	expect(recordRes.ok()).toBeTruthy();
	const recordBody = await recordRes.json();
	// A complimentary membership has its dues waived, so the whole amount is booked as a donation.
	expect(recordBody.membership_amount).toBe(0);
	expect(recordBody.donation_amount).toBe(40);

	const { data: payRows } = await supabaseAdmin
		.from('payments')
		.select('membership_amount, donation_amount')
		.eq('membership_id', membershipId);
	expect(payRows).toHaveLength(1);
	expect(Number(payRows?.[0].membership_amount)).toBe(0);
	expect(Number(payRows?.[0].donation_amount)).toBe(40);

	const { data: row } = await supabaseAdmin
		.from('memberships')
		.select('status, complimentary')
		.eq('id', membershipId)
		.single();
	expect(row?.status).toBe('active');
	expect(row?.complimentary).toBe(true);

	await adminApi.dispose();
});

test('recording a dues portion on a complimentary membership is rejected', async () => {
	const supabaseAdmin = serviceClient();
	const member = await newMember({ firstName: 'CompDues', lastName: 'E2E' });
	const adminApi = await apiContextFor(admin.email);

	const createRes = await adminApi.post(`/api/admin/members/${member.memberId}/memberships`, {
		data: { year: currentMembershipYear(), tier: 'associate', initial: 'complimentary' },
	});
	expect(createRes.ok()).toBeTruthy();
	const { membership_id: membershipId } = await createRes.json();

	// The API route always books donations for complimentary rows, so exercise the RPC guard directly.
	const { data: rpcResult } = await supabaseAdmin.rpc('record_manual_payment', {
		p_membership_id: membershipId,
		p_amount: 25,
		p_membership_amount: 25,
		p_donation_amount: 0,
		p_method: 'cash',
		p_payment_date: null,
		p_notes: null,
		p_donation_note: null,
		p_reference: null,
	});
	const result = rpcResult as { ok?: boolean; error?: string } | null;
	expect(result?.ok).toBe(false);
	expect(result?.error).toBe('complimentary_membership');

	const { data: payRows } = await supabaseAdmin
		.from('payments')
		.select('id')
		.eq('membership_id', membershipId);
	expect(payRows).toHaveLength(0);

	await adminApi.dispose();
});

test('admin upgrades an associate membership to voting, then the member pays and becomes active', async () => {
	const supabaseAdmin = serviceClient();
	const member = await newMember({
		firstName: 'Upgrade',
		lastName: 'E2E',
		lakeCivicNumber: '100',
		lakeStreetName: 'Chemin Test Upgrade',
	});
	const memberApi = await apiContextFor(member.email);
	const adminApi = await apiContextFor(admin.email);

	const pendingRes = await memberApi.post('/api/membership/create-pending', { data: { tier: 'associate' } });
	expect(pendingRes.ok()).toBeTruthy();
	const { id: membershipId } = await pendingRes.json();

	const upgradeRes = await adminApi.post(`/api/admin/memberships/${membershipId}/upgrade-to-voting`);
	expect(upgradeRes.ok()).toBeTruthy();

	const { data: upgradedRow } = await supabaseAdmin
		.from('memberships')
		.select('tier, status')
		.eq('id', membershipId)
		.single();
	expect(upgradedRow?.tier).toBe('voting');
	// Associate dues already paid ($0 here) don't cover the higher voting fee, so status stays pending.
	expect(upgradedRow?.status).toBe('pending');

	const { webhookRes } = await completeStripeCheckout(memberApi, { membershipId });
	expect(webhookRes.status()).toBe(200);

	const { data: paidRow } = await supabaseAdmin
		.from('memberships')
		.select('status')
		.eq('id', membershipId)
		.single();
	expect(paidRow?.status).toBe('active');

	await memberApi.dispose();
	await adminApi.dispose();
});

test('member creates a membership, pays offline, and admin marking it received activates it', async () => {
	const supabaseAdmin = serviceClient();
	const member = await newMember({ firstName: 'Offline', lastName: 'E2E' });
	const memberApi = await apiContextFor(member.email);
	const adminApi = await apiContextFor(admin.email);

	const pendingRes = await memberApi.post('/api/membership/create-pending', { data: { tier: 'associate' } });
	const { id: membershipId } = await pendingRes.json();

	const { data: pendingRow } = await supabaseAdmin
		.from('memberships')
		.select('status')
		.eq('id', membershipId)
		.single();
	expect(pendingRow?.status).toBe('pending');

	const recordRes = await adminApi.post(`/api/admin/memberships/${membershipId}/record-payment`, {
		data: { amount: 25, method: 'e-transfer', notes: 'e2e offline payment' },
	});
	expect(recordRes.ok()).toBeTruthy();

	const { data: activeRow } = await supabaseAdmin
		.from('memberships')
		.select('status')
		.eq('id', membershipId)
		.single();
	expect(activeRow?.status).toBe('active');

	const { data: paymentRows } = await supabaseAdmin
		.from('payments')
		.select('method, membership_amount')
		.eq('membership_id', membershipId);
	expect(paymentRows).toHaveLength(1);
	expect(paymentRows?.[0].method).toBe('e-transfer');

	await memberApi.dispose();
	await adminApi.dispose();
});

test('admin can cancel a pending membership', async () => {
	const supabaseAdmin = serviceClient();
	const member = await newMember({ firstName: 'AdminCancel', lastName: 'E2E' });
	const memberApi = await apiContextFor(member.email);
	const adminApi = await apiContextFor(admin.email);

	const pendingRes = await memberApi.post('/api/membership/create-pending', { data: { tier: 'associate' } });
	const { id: membershipId } = await pendingRes.json();

	const cancelRes = await adminApi.post(`/api/admin/memberships/${membershipId}/cancel-pending`);
	expect(cancelRes.ok()).toBeTruthy();

	const { data: row } = await supabaseAdmin.from('memberships').select('id').eq('id', membershipId).maybeSingle();
	expect(row).toBeNull();

	await memberApi.dispose();
	await adminApi.dispose();
});

test('member can cancel their own pending membership', async () => {
	const supabaseAdmin = serviceClient();
	const member = await newMember({ firstName: 'SelfCancel', lastName: 'E2E' });
	const memberApi = await apiContextFor(member.email);

	const pendingRes = await memberApi.post('/api/membership/create-pending', { data: { tier: 'associate' } });
	const { id: membershipId } = await pendingRes.json();

	const cancelRes = await memberApi.post('/api/membership/cancel-pending', { data: { membershipId } });
	expect(cancelRes.ok()).toBeTruthy();

	const { data: row } = await supabaseAdmin.from('memberships').select('id').eq('id', membershipId).maybeSingle();
	expect(row).toBeNull();

	await memberApi.dispose();
});

test('a signed-in non-admin is rejected from admin membership routes', async () => {
	const member = await newMember({ firstName: 'NonAdmin', lastName: 'E2E' });
	const memberApi = await apiContextFor(member.email);

	const listRes = await memberApi.get('/api/admin/memberships');
	expect(listRes.status()).toBe(403);

	const upgradeRes = await memberApi.post('/api/admin/memberships/00000000-0000-0000-0000-000000000000/upgrade-to-voting');
	expect(upgradeRes.status()).toBe(403);

	const makeComplimentaryRes = await memberApi.post(
		'/api/admin/memberships/00000000-0000-0000-0000-000000000000/make-complimentary',
	);
	expect(makeComplimentaryRes.status()).toBe(403);

	const removeComplimentaryRes = await memberApi.post(
		'/api/admin/memberships/00000000-0000-0000-0000-000000000000/remove-complimentary',
	);
	expect(removeComplimentaryRes.status()).toBe(403);

	const recordPaymentRes = await memberApi.post(
		'/api/admin/memberships/00000000-0000-0000-0000-000000000000/record-payment',
		{ data: { amount: 25, method: 'cash' } },
	);
	expect(recordPaymentRes.status()).toBe(403);

	const promoteRes = await memberApi.post(`/api/admin/members/${member.memberId}/promote-admin`);
	expect(promoteRes.status()).toBe(403);

	await memberApi.dispose();
});
