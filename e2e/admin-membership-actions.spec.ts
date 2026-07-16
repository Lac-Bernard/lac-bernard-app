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
import { completeStripeCheckout } from './support/stripe';

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
