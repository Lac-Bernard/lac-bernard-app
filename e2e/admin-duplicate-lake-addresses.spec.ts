import { test, expect } from '@playwright/test';
import {
	apiContextFor,
	createTestMember,
	deleteTestMember,
	grantAdminRole,
	signInWithMagicLink,
	type TestMember,
} from './support/testMember';

let admin: TestMember;
let members: TestMember[] = [];

test.beforeAll(async () => {
	admin = await createTestMember({ firstName: 'Admin', lastName: 'DupViewE2E' });
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

test('admin member index "duplicate" view returns only members sharing a lake address', async () => {
	const sharedCivic = '12';
	const sharedStreet = 'Chemin du Lac Bernard';

	// Places-entered and manually-entered addresses should both dedupe on civic + street.
	const dupOne = await newMember({ firstName: 'DupOne', lastName: 'DuplicateE2E', lakeCivicNumber: sharedCivic, lakeStreetName: sharedStreet });
	const dupTwo = await newMember({
		firstName: 'DupTwo',
		lastName: 'DuplicateE2E',
		lakeCivicNumber: sharedCivic,
		// Different casing/whitespace should still normalize to the same key.
		lakeStreetName: `  ${sharedStreet.toUpperCase()}  `,
	});
	const unique = await newMember({ firstName: 'Unique', lastName: 'AddressE2E', lakeCivicNumber: '99', lakeStreetName: 'Chemin Seul' });
	const noAddress = await newMember({ firstName: 'NoAddress', lastName: 'MemberE2E' });

	const adminApi = await apiContextFor(admin.email);
	const res = await adminApi.get('/api/admin/members?view=duplicate&limit=50');
	expect(res.ok()).toBeTruthy();
	const body = await res.json();

	const ids = (body.members as Array<{ id: string }>).map((m) => m.id);
	expect(ids).toContain(dupOne.memberId);
	expect(ids).toContain(dupTwo.memberId);
	expect(ids).not.toContain(unique.memberId);
	expect(ids).not.toContain(noAddress.memberId);
	expect(body.index?.counts?.duplicate).toBeGreaterThanOrEqual(2);

	await adminApi.dispose();
});

test('admin can browse to the duplicate-address named view in the admin console', async ({ page }) => {
	const sharedCivic = '45';
	const sharedStreet = 'Chemin des Pins';
	const dupOne = await newMember({ firstName: 'BrowseDupOne', lastName: 'DuplicateBrowseE2E', lakeCivicNumber: sharedCivic, lakeStreetName: sharedStreet });
	const dupTwo = await newMember({ firstName: 'BrowseDupTwo', lastName: 'DuplicateBrowseE2E', lakeCivicNumber: sharedCivic, lakeStreetName: sharedStreet });
	const unique = await newMember({ firstName: 'BrowseUnique', lastName: 'AddressBrowseE2E', lakeCivicNumber: '7', lakeStreetName: 'Chemin Unique' });

	await signInWithMagicLink(page, admin.email, '/en/membership/admin?tab=members&view=duplicate');

	const pill = page.locator('[data-member-view="duplicate"]');
	await expect(pill).toBeVisible();
	await expect(pill).toHaveAttribute('aria-pressed', 'true');

	await expect(page.getByText('BrowseDupOne DuplicateBrowseE2E')).toBeVisible();
	await expect(page.getByText('BrowseDupTwo DuplicateBrowseE2E')).toBeVisible();
	await expect(page.getByText('BrowseUnique AddressBrowseE2E')).not.toBeVisible();
});
