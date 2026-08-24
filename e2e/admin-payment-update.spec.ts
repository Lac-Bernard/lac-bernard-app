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

test('admin updates a payment donation category, including clearing it back to null', async () => {
	const supabaseAdmin = serviceClient();
	const member = await newMember({ firstName: 'EditCategory', lastName: 'E2E' });
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

	const payRes = await adminApi.post(`/api/admin/memberships/${membershipId}/record-payment`, {
		data: { amount: 10, method: 'cash', donationCategory: 'environment' },
	});
	expect(payRes.ok()).toBeTruthy();
	const { payment_id: donationPaymentId } = await payRes.json();

	const { data: before } = await supabaseAdmin
		.from('payments')
		.select('donation_category')
		.eq('id', donationPaymentId)
		.single();
	expect(before?.donation_category).toBe('environment');

	const patchRes = await adminApi.patch(
		`/api/admin/members/${member.memberId}/payments/${donationPaymentId}`,
		{ data: { donationCategory: 'regatta' } },
	);
	expect(patchRes.ok()).toBeTruthy();
	const patchBody = await patchRes.json();
	expect(patchBody.donation_category).toBe('regatta');

	const { data: afterUpdate } = await supabaseAdmin
		.from('payments')
		.select('donation_category')
		.eq('id', donationPaymentId)
		.single();
	expect(afterUpdate?.donation_category).toBe('regatta');

	const clearRes = await adminApi.patch(
		`/api/admin/members/${member.memberId}/payments/${donationPaymentId}`,
		{ data: { donationCategory: null } },
	);
	expect(clearRes.ok()).toBeTruthy();
	const clearBody = await clearRes.json();
	expect(clearBody.donation_category).toBeNull();

	const { data: afterClear } = await supabaseAdmin
		.from('payments')
		.select('donation_category')
		.eq('id', donationPaymentId)
		.single();
	expect(afterClear?.donation_category).toBeNull();

	// The dues-only payment from the initial membership creation has no donation portion —
	// the RPC forces the category back to null even if a category is requested.
	const zeroRes = await adminApi.patch(
		`/api/admin/members/${member.memberId}/payments/${paymentId}`,
		{ data: { donationCategory: 'general' } },
	);
	expect(zeroRes.ok()).toBeTruthy();
	const zeroBody = await zeroRes.json();
	expect(zeroBody.donation_category).toBeNull();

	const { data: zeroRow } = await supabaseAdmin
		.from('payments')
		.select('donation_category')
		.eq('id', paymentId)
		.single();
	expect(zeroRow?.donation_category).toBeNull();

	await adminApi.dispose();
});

test('admin cannot update a payment with an invalid donation category', async () => {
	const member = await newMember({ firstName: 'InvalidCategory', lastName: 'E2E' });
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
	const { payment_id: paymentId } = await msRes.json();

	const res = await adminApi.patch(`/api/admin/members/${member.memberId}/payments/${paymentId}`, {
		data: { donationCategory: 'not-a-real-category' },
	});
	expect(res.status()).toBe(400);
	const body = await res.json();
	expect(body.error).toBe('invalid_donation_category');

	await adminApi.dispose();
});

test('admin cannot update a payment that belongs to a different member', async () => {
	const supabaseAdmin = serviceClient();
	const owner = await newMember({ firstName: 'UpdateOwner', lastName: 'E2E' });
	const otherMember = await newMember({ firstName: 'UpdateNotOwner', lastName: 'E2E' });
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

	const res = await adminApi.patch(`/api/admin/members/${otherMember.memberId}/payments/${paymentId}`, {
		data: { donationCategory: 'general' },
	});
	expect(res.status()).toBe(404);

	const { data: unchanged } = await supabaseAdmin
		.from('payments')
		.select('donation_category')
		.eq('id', paymentId)
		.single();
	expect(unchanged?.donation_category).toBeNull();

	await adminApi.dispose();
});
