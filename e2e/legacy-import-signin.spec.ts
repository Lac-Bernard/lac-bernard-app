import { test, expect } from '@playwright/test';
import { currentMembershipYear } from './support/env';
import { createTestMember, deleteTestMember, serviceClient, signInWithMagicLink, type TestMember } from './support/testMember';

let member: TestMember;

test.afterEach(async () => {
	if (member) await deleteTestMember(member);
});

test('a member imported from the legacy sheet sees their active membership on first sign-in', async ({ page }) => {
	const supabaseAdmin = serviceClient();

	// Simulates the CSV import: member + an already-active membership exist before the person
	// ever signs in (no user_id yet — claim_member() links it on first sign-in).
	member = await createTestMember({ firstName: 'Legacy', lastName: 'Import' });
	const { error: msErr } = await supabaseAdmin.from('memberships').insert({
		member_id: member.memberId,
		year: currentMembershipYear(),
		tier: 'associate',
		status: 'active',
		activated_at: new Date().toISOString(),
	});
	expect(msErr).toBeNull();

	await signInWithMagicLink(page, member.email);

	await expect(page).toHaveURL(/\/en\/membership\/account\/?$/);
	await expect(page.locator('.memberActiveCard')).toBeVisible();
});
