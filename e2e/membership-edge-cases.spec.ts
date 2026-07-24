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

test('voting tier still blocks a second membership when one address was typed manually and the other via Google Places', async () => {
	// Same physical unit, two different capture paths: a manual entrant just types the visible
	// civic number, while Google Places composes civic as `${subpremise}-${streetNumber}` when the
	// address has a unit/subpremise component (see parsePlaceDetailsToLake in
	// src/lib/places/parsePlaceDetails.ts). normalize_lake_address_key only lowercases/trims/
	// collapses whitespace, so these two representations of the same address don't collide there.
	const street = 'Chemin du Lac Bernard';
	const manual = await newMember({
		firstName: 'ManualEntry',
		lastName: 'AddressFormatE2E',
		lakeCivicNumber: '123A',
		lakeStreetName: street,
	});
	const viaPlaces = await newMember({
		firstName: 'PlacesEntry',
		lastName: 'AddressFormatE2E',
		lakeCivicNumber: 'A-123',
		lakeStreetName: street,
	});

	const manualApi = await apiContextFor(manual.email);
	const manualRes = await manualApi.post('/api/membership/create-pending', { data: { tier: 'voting' } });
	expect(manualRes.ok()).toBeTruthy();

	const placesApi = await apiContextFor(viaPlaces.email);
	const placesRes = await placesApi.post('/api/membership/create-pending', { data: { tier: 'voting' } });
	expect(placesRes.status()).toBe(409);
	const placesBody = await placesRes.json();
	expect(placesBody.error).toBe('voting_address_taken');

	await manualApi.dispose();
	await placesApi.dispose();
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
