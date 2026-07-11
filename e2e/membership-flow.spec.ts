import { test, expect } from '@playwright/test';
import { createTestMember, deleteTestMember, signInWithMagicLink, type TestMember } from './support/testMember';

let member: TestMember;

test.beforeAll(async () => {
	member = await createTestMember({ firstName: 'Playwright', lastName: 'E2E' });
});

test.afterAll(async () => {
	await deleteTestMember(member);
});

test('member can sign in, see their status, create a membership, and reach Stripe checkout', async ({ page }) => {
	await signInWithMagicLink(page, member.email);

	await expect(page).toHaveURL(/\/en\/membership\/account\/?$/);

	// No membership for the current year yet.
	await expect(page.locator('#create-pending-form')).toBeVisible();

	// Associate tier needs no lake address, so it's always selectable.
	await page.locator('#create-pending-form input[name="tier"][value="associate"]').check();

	// Read the create-checkout-session response body inside the route handler itself, rather
	// than via page.waitForResponse() afterwards — the page's own script calls
	// window.location.assign(body.url) as soon as it reads the body, and that navigation tends
	// to tear down the CDP connection before an external response.json() call can run. We're
	// not driving Stripe's hosted checkout UI here — webhook-driven activation is covered
	// separately in webhook-fulfillment.spec.ts — so block the navigation too.
	let checkoutUrl: string | null = null;
	await page.route('**/api/membership/create-checkout-session', async (route) => {
		const response = await route.fetch();
		const body = await response.json();
		checkoutUrl = typeof body.url === 'string' ? body.url : null;
		await route.fulfill({ response, json: body });
	});
	await page.route('https://checkout.stripe.com/**', (route) => route.abort());

	await page.locator('#open-checkout-modal').click();
	await page.locator('#checkout-modal-submit').click();
	await expect.poll(() => checkoutUrl).not.toBeNull();

	expect(checkoutUrl).toContain('checkout.stripe.com');
});
