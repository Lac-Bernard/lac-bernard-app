import { test, expect } from '@playwright/test';
import {
	createTestMember,
	deleteTestMember,
	serviceClient,
	waitForSignInEmailLink,
	type TestMember,
} from './support/testMember';

let member: TestMember;

test.afterEach(async () => {
	if (member) await deleteTestMember(member);
});

test('a disabled member is signed out and shown a friendly notice instead of signing in', async ({ page }) => {
	member = await createTestMember({ firstName: 'Disabled', lastName: 'Member' });
	const { error: statusErr } = await serviceClient()
		.from('members')
		.update({ status: 'disabled' })
		.eq('id', member.memberId);
	expect(statusErr).toBeNull();

	// Real sign-in request (sets the PKCE code-verifier cookie in this browser context) and a
	// real magic-link email, so the callback route's code exchange runs for real.
	await page.goto('/en/membership/account/sign-in');
	await page.fill('#email', member.email);
	await page.click('#submit-btn');
	await expect(page.locator('#form-message')).not.toHaveText('');

	const verifyUrl = await waitForSignInEmailLink(member.email);
	await page.goto(verifyUrl);

	// The page's own script strips `signin_error`/`account` from the URL once it renders the
	// notice (see MemberSignInView.astro), so assert on the rendered message, not the URL.
	await expect(page).toHaveURL(/\/en\/membership\/account\/sign-in/);
	await expect(page.locator('#form-message')).toContainText('membership@lacbernard.ca');

	// The callback signs the disabled member back out, so no session should persist.
	await page.goto('/en/membership/account');
	await expect(page).toHaveURL(/\/en\/membership\/account\/sign-in/);
});

test('a normal (non-disabled) member can still sign in via the real magic-link callback', async ({ page }) => {
	member = await createTestMember({ firstName: 'Enabled', lastName: 'Member' });

	await page.goto('/en/membership/account/sign-in');
	await page.fill('#email', member.email);
	await page.click('#submit-btn');
	await expect(page.locator('#form-message')).not.toHaveText('');

	const verifyUrl = await waitForSignInEmailLink(member.email);
	await page.goto(verifyUrl);

	await expect(page).toHaveURL(/\/en\/membership\/account\/?(\?|$)/);
	await expect(page.locator('#form-message')).toHaveCount(0);
});
