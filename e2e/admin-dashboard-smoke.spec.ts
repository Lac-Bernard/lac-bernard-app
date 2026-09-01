import { test, expect } from '@playwright/test';
import { apiContextFor, createTestMember, deleteTestMember, grantAdminRole, type TestMember } from './support/testMember';

let admin: TestMember;

test.beforeAll(async () => {
	admin = await createTestMember({ firstName: 'Admin', lastName: 'DashboardSmokeE2E' });
	await grantAdminRole(admin.email);
});

test.afterAll(async () => {
	await deleteTestMember(admin);
});

test('admin dashboard page loads', async () => {
	const adminApi = await apiContextFor(admin.email);

	const res = await adminApi.get('/en/membership/admin');
	expect(res.ok()).toBeTruthy();

	await adminApi.dispose();
});
