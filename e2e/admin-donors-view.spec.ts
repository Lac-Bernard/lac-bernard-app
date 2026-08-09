import { test, expect } from '@playwright/test';
import { currentMembershipYear } from './support/env';
import {
	apiContextFor,
	createTestMember,
	deleteTestMember,
	grantAdminRole,
	type TestMember,
} from './support/testMember';

let admin: TestMember;
let members: TestMember[] = [];

test.beforeAll(async () => {
	admin = await createTestMember({ firstName: 'Admin', lastName: 'DonorsViewE2E' });
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

test('admin member index "donors" view returns members with a donation this membership year', async () => {
	const year = currentMembershipYear();
	const donor = await newMember({ firstName: 'Donor', lastName: 'DonorsViewE2E' });
	const duesOnly = await newMember({ firstName: 'DuesOnly', lastName: 'DonorsViewE2E' });
	const adminApi = await apiContextFor(admin.email);

	const donorMs = await adminApi.post(`/api/admin/members/${donor.memberId}/memberships`, {
		data: {
			year,
			tier: 'associate',
			initial: 'active_with_payment',
			payment: {
				amount: 35,
				method: 'cheque',
				donationCategory: 'environment',
				notes: 'e2e donor with gift',
			},
		},
	});
	expect(donorMs.ok()).toBeTruthy();

	const duesMs = await adminApi.post(`/api/admin/members/${duesOnly.memberId}/memberships`, {
		data: {
			year,
			tier: 'associate',
			initial: 'active_with_payment',
			payment: { amount: 25, method: 'cash', notes: 'e2e dues only' },
		},
	});
	expect(duesMs.ok()).toBeTruthy();

	const res = await adminApi.get(`/api/admin/members?view=donors&year=${year}&limit=100`);
	expect(res.ok()).toBeTruthy();
	const body = await res.json();

	const ids = (body.members as Array<{ id: string }>).map((m) => m.id);
	expect(ids).toContain(donor.memberId);
	expect(ids).not.toContain(duesOnly.memberId);
	expect(body.index?.counts?.donors).toBeGreaterThanOrEqual(1);

	await adminApi.dispose();
});
