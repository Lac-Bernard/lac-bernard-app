import { test, expect } from '@playwright/test';
import {
	apiContextFor,
	createTestMember,
	deleteTestMember,
	serviceClient,
	setTestMemberLakeAddress,
	signInWithMagicLink,
	type TestMember,
} from './support/testMember';
import { completeStripeCheckout } from './support/stripe';

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

/**
 * Two members at addresses that are the *same physical property* but formatted differently
 * (manual entry vs Google Places, or just different human spelling conventions). The second
 * member's voting purchase must still be blocked as `voting_address_taken`.
 */
async function expectFormatVariantsBlockVoting(
	addressA: { civic: string; street: string },
	addressB: { civic: string; street: string },
): Promise<void> {
	const first = await newMember({ firstName: 'First', lastName: 'AddressFormatE2E', lakeCivicNumber: addressA.civic, lakeStreetName: addressA.street });
	const second = await newMember({ firstName: 'Second', lastName: 'AddressFormatE2E', lakeCivicNumber: addressB.civic, lakeStreetName: addressB.street });

	const firstApi = await apiContextFor(first.email);
	const firstRes = await firstApi.post('/api/membership/create-pending', { data: { tier: 'voting' } });
	expect(firstRes.ok()).toBeTruthy();

	const secondApi = await apiContextFor(second.email);
	const secondRes = await secondApi.post('/api/membership/create-pending', { data: { tier: 'voting' } });
	expect(secondRes.status()).toBe(409);
	expect((await secondRes.json()).error).toBe('voting_address_taken');

	await firstApi.dispose();
	await secondApi.dispose();
}

test('voting tier allows only one active/pending membership per lake property per year', async () => {
	const civic = '42';
	const street = 'Chemin Du Partage E2E';
	const first = await newMember({ firstName: 'First', lastName: 'Owner', lakeCivicNumber: civic, lakeStreetName: street });
	const second = await newMember({ firstName: 'Second', lastName: 'Owner', lakeCivicNumber: civic, lakeStreetName: street });

	const firstApi = await apiContextFor(first.email);
	const firstRes = await firstApi.post('/api/membership/create-pending', { data: { tier: 'voting' } });
	expect(firstRes.ok()).toBeTruthy();

	const secondApi = await apiContextFor(second.email);
	const secondRes = await secondApi.post('/api/membership/create-pending', { data: { tier: 'voting' } });
	expect(secondRes.status()).toBe(409);
	const secondBody = await secondRes.json();
	expect(secondBody.error).toBe('voting_address_taken');

	await firstApi.dispose();
	await secondApi.dispose();
});

test('voting tier still blocks a second membership when one civic number was typed manually and the other via Google Places', async () => {
	// Same physical unit, two different capture paths: a manual entrant just types the visible
	// civic number, while Google Places composes civic as `${subpremise}-${streetNumber}` when the
	// address has a unit/subpremise component (see parsePlaceDetailsToLake in
	// src/lib/places/parsePlaceDetails.ts). "123A" vs "A-123" must still collide.
	await expectFormatVariantsBlockVoting(
		{ civic: '123A', street: 'Chemin du Lac Bernard' },
		{ civic: 'A-123', street: 'Chemin du Lac Bernard' },
	);
});

test('voting tier still blocks a second membership when a civic number has a leading zero', async () => {
	// "007" and "7" describe the same civic number.
	await expectFormatVariantsBlockVoting(
		{ civic: '007', street: 'Chemin du Lac Bernard' },
		{ civic: '7', street: 'Chemin du Lac Bernard' },
	);
});

test('voting tier still blocks a second membership when a street name uses a hyphen vs a space', async () => {
	// Quebec toponymy often hyphenates compound names (Places returns the official hyphenated
	// form); a manual entrant just as often types the same name with a space instead.
	await expectFormatVariantsBlockVoting(
		{ civic: '12', street: 'Chemin du Lac-Bernard' },
		{ civic: '12', street: 'Chemin du Lac Bernard' },
	);
});

test('voting tier still blocks a second membership when a street name has accents vs not', async () => {
	// Places returns the accented official form; manual entry often omits accents.
	await expectFormatVariantsBlockVoting(
		{ civic: '12', street: 'Chemin de la Baie Régatta' },
		{ civic: '12', street: 'Chemin de la Baie Regatta' },
	);
});

test('voting tier still blocks a second membership when one entry omits the generic road-type prefix', async () => {
	// The actual production scenario: one member has civic 121 and street "Baie Regatta"
	// (manually typed, distinctive part only), the other has civic 121 and street "Chemin de
	// la Baie-Regatta" (Google Places' full official route name, hyphenated). Both describe the
	// same property.
	await expectFormatVariantsBlockVoting(
		{ civic: '121', street: 'Baie Regatta' },
		{ civic: '121', street: 'Chemin de la Baie-Regatta' },
	);
});

test('voting tier does not confuse genuinely different addresses despite the looser format matching', async () => {
	const different = await newMember({ firstName: 'Different', lastName: 'CivicE2E', lakeCivicNumber: '123', lakeStreetName: 'Chemin du Lac Bernard' });
	const differentApi = await apiContextFor(different.email);
	const differentRes = await differentApi.post('/api/membership/create-pending', { data: { tier: 'voting' } });
	expect(differentRes.ok()).toBeTruthy();

	const otherCivic = await newMember({ firstName: 'OtherCivic', lastName: 'CivicE2E', lakeCivicNumber: '124', lakeStreetName: 'Chemin du Lac Bernard' });
	const otherCivicApi = await apiContextFor(otherCivic.email);
	const otherCivicRes = await otherCivicApi.post('/api/membership/create-pending', { data: { tier: 'voting' } });
	expect(otherCivicRes.ok()).toBeTruthy();

	const otherStreet = await newMember({ firstName: 'OtherStreet', lastName: 'CivicE2E', lakeCivicNumber: '123', lakeStreetName: 'Chemin du Lac Seul' });
	const otherStreetApi = await apiContextFor(otherStreet.email);
	const otherStreetRes = await otherStreetApi.post('/api/membership/create-pending', { data: { tier: 'voting' } });
	expect(otherStreetRes.ok()).toBeTruthy();

	await differentApi.dispose();
	await otherCivicApi.dispose();
	await otherStreetApi.dispose();
});

test('the account page greys out voting up front when the address is already taken, without needing a failed submit', async ({ page }) => {
	// Existing voting member at the address (Places-style formatting).
	const existing = await newMember({
		firstName: 'ExistingVoter',
		lastName: 'PreCheckE2E',
		lakeCivicNumber: '121',
		lakeStreetName: 'Chemin de la Baie-Regatta',
	});
	const existingApi = await apiContextFor(existing.email);
	const existingRes = await existingApi.post('/api/membership/create-pending', { data: { tier: 'voting' } });
	expect(existingRes.ok()).toBeTruthy();
	await existingApi.dispose();

	// New member at the same physical address, manually typed, no membership yet this year.
	const newcomer = await newMember({
		firstName: 'Newcomer',
		lastName: 'PreCheckE2E',
		lakeCivicNumber: '121',
		lakeStreetName: 'Baie Regatta',
	});

	await signInWithMagicLink(page, newcomer.email, '/en/membership/account');

	const votingTile = page.locator('.tierOptionTile', { has: page.locator('input[value="voting"]') });
	const votingRadio = votingTile.locator('input[name="tier"][value="voting"]');
	await expect(votingRadio).toBeDisabled();
	await expect(votingRadio).not.toBeChecked();

	const associateRadio = page.locator('input[name="tier"][value="associate"]');
	await expect(associateRadio).toBeChecked();

	// The notice lives inside the voting tile itself (like the "no lake address" explainer does),
	// not in a separate disconnected paragraph below the tier grid.
	await expect(votingTile.locator('.tierOptionExplainer')).toContainText('membership@lacbernard.ca');
});

test('the account page still offers voting up front for a member at a unique address', async ({ page }) => {
	const member = await newMember({
		firstName: 'UniqueVoter',
		lastName: 'PreCheckE2E',
		lakeCivicNumber: '55',
		lakeStreetName: 'Chemin Bien à Moi',
	});

	await signInWithMagicLink(page, member.email, '/en/membership/account');

	const votingRadio = page.locator('input[name="tier"][value="voting"]');
	await expect(votingRadio).toBeEnabled();
	await expect(votingRadio).toBeChecked();
});

test('a member without a lake address cannot claim voting tier until one is added', async () => {
	const member = await newMember({ firstName: 'NoLake', lastName: 'E2E' });
	const api = await apiContextFor(member.email);

	const beforeRes = await api.post('/api/membership/create-pending', { data: { tier: 'voting' } });
	expect(beforeRes.status()).toBe(409);
	expect((await beforeRes.json()).error).toBe('no_lake_address');

	await setTestMemberLakeAddress(member, '7', 'Chemin Devient Eligible');

	const afterRes = await api.post('/api/membership/create-pending', { data: { tier: 'voting' } });
	expect(afterRes.ok()).toBeTruthy();

	await api.dispose();
});

test('a member cannot start a second checkout for an already-active membership', async () => {
	const member = await newMember({ firstName: 'NoDoublePay', lastName: 'E2E' });
	const api = await apiContextFor(member.email);

	const pendingRes = await api.post('/api/membership/create-pending', { data: { tier: 'associate' } });
	const { id: membershipId } = await pendingRes.json();

	const { webhookRes } = await completeStripeCheckout(api, { membershipId });
	expect(webhookRes.status()).toBe(200);

	const secondCheckoutRes = await api.post('/api/membership/create-checkout-session', {
		data: { membershipId, donationDollars: 0, donationNote: '', locale: 'en' },
	});
	expect(secondCheckoutRes.status()).toBe(409);
	expect((await secondCheckoutRes.json()).error).toBe('invalid_membership');

	await api.dispose();
});

test('signing in with an email that matches no member row lands on the join page, not a crash', async ({ page }) => {
	const email = `e2e-unmatched-${Date.now()}@example.com`;
	const supabaseAdmin = serviceClient();

	await signInWithMagicLink(page, email);

	await expect(page).toHaveURL(/\/en\/membership\/account\/new/);
	await expect(page.locator('#member-profile-form')).toBeVisible();

	const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
	const authUser = userList?.users.find((u) => u.email === email);
	if (authUser) await supabaseAdmin.auth.admin.deleteUser(authUser.id);
});
