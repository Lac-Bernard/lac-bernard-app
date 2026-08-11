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

/**
 * `members.status = 'disabled'` must drop a member out of the admin members tab and out of
 * both exports (copy-email-list + CSV) unless disabled rows are explicitly asked for.
 *
 * Every test pairs a disabled member with an otherwise-identical enrolled one so an assertion
 * can only pass because of the status filter — not because the row was missing to begin with.
 */

let admin: TestMember;
const members: TestMember[] = [];

// Unique per run so the search-based assertions can't collide with real local dev data.
const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const lastName = `DisabledFilterE2E${suffix}`;

let enrolled: TestMember;
let disabled: TestMember;

test.beforeAll(async () => {
	admin = await createTestMember({ firstName: 'Admin', lastName: 'DisabledFilterE2E' });
	await grantAdminRole(admin.email);

	enrolled = await newMember('Enrolled');
	disabled = await newMember('Disabled');

	const adminApi = await apiContextFor(admin.email);
	// Both get an active associate membership for the current year, so both qualify for the
	// associate/mailing/all views on membership grounds alone. (Associate rather than voting:
	// voting memberships carry lake-address eligibility rules irrelevant to the status filter.)
	for (const m of [enrolled, disabled]) {
		const res = await adminApi.post(`/api/admin/members/${m.memberId}/memberships`, {
			data: { year: currentMembershipYear(), tier: 'associate', initial: 'complimentary' },
		});
		expect(res.ok(), await res.text()).toBeTruthy();
	}
	await adminApi.dispose();

	// Opt both into email so the opt-in-scoped copy-email export covers them.
	await setMemberFields(enrolled, { status: 'enrolled', email_opt_in: true });
	await setMemberFields(disabled, { status: 'disabled', email_opt_in: true });
});

test.afterAll(async () => {
	await deleteTestMember(admin);
	await Promise.all(members.map((m) => deleteTestMember(m)));
});

async function newMember(firstName: string): Promise<TestMember> {
	const m = await createTestMember({ firstName, lastName });
	members.push(m);
	return m;
}

async function setMemberFields(
	member: TestMember,
	fields: { status: 'new' | 'enrolled' | 'disabled'; email_opt_in: boolean },
): Promise<void> {
	const { error } = await serviceClient().from('members').update(fields).eq('id', member.memberId);
	if (error) throw new Error(`Failed to set fields on ${member.email}: ${error.message}`);
}

/** Newest-first + max page size keeps the just-seeded members on page 1 regardless of dev data. */
async function idsForView(
	adminApi: Awaited<ReturnType<typeof apiContextFor>>,
	query: string,
): Promise<{ ids: string[]; body: any }> {
	const res = await adminApi.get(`/api/admin/members?${query}&limit=100&sort=created_at_desc`);
	expect(res.ok()).toBeTruthy();
	const body = await res.json();
	return { ids: (body.members as Array<{ id: string }>).map((m) => m.id), body };
}

test('disabled members are excluded from every default admin members view', async () => {
	const adminApi = await apiContextFor(admin.email);

	for (const view of ['all', 'associate', 'mailing'] as const) {
		const { ids } = await idsForView(adminApi, `view=${view}`);
		expect(ids, `${view} view should list the enrolled member`).toContain(enrolled.memberId);
		expect(ids, `${view} view should hide the disabled member`).not.toContain(disabled.memberId);
	}

	await adminApi.dispose();
});

test('includeDisabled brings disabled members back into the all view and its pill count', async () => {
	const adminApi = await apiContextFor(admin.email);

	const withoutDisabled = await idsForView(adminApi, 'view=all');
	const withDisabled = await idsForView(adminApi, 'view=all&includeDisabled=1');

	expect(withDisabled.ids).toContain(enrolled.memberId);
	expect(withDisabled.ids).toContain(disabled.memberId);

	// Counts are directory-wide, so compare the two calls rather than asserting an absolute number.
	const allWithout = withoutDisabled.body.index.counts.all as number;
	const allWith = withDisabled.body.index.counts.all as number;
	expect(allWith).toBeGreaterThan(allWithout);

	await adminApi.dispose();
});

test('search hides disabled matches by default and reports how many it hid', async () => {
	const adminApi = await apiContextFor(admin.email);

	const plain = await idsForView(adminApi, `view=all&q=${encodeURIComponent(lastName)}`);
	expect(plain.ids).toEqual([enrolled.memberId]);
	expect(plain.body.index.searchDisabledMatches).toBeGreaterThanOrEqual(1);

	const including = await idsForView(
		adminApi,
		`view=all&includeDisabled=1&q=${encodeURIComponent(lastName)}`,
	);
	expect(including.ids).toHaveLength(2);
	expect(including.ids).toContain(disabled.memberId);

	await adminApi.dispose();
});

test('copy email list omits disabled members in both opt-in and all scopes', async () => {
	const adminApi = await apiContextFor(admin.email);

	for (const query of ['view=mailing&emailScope=opt_in', 'view=all&emailScope=all']) {
		const res = await adminApi.get(`/api/admin/member-emails-export?${query}`);
		expect(res.ok()).toBeTruthy();
		const { lines } = await res.json();
		expect(lines, `${query} should include the enrolled member`).toContain(enrolled.email);
		expect(lines, `${query} should omit the disabled member`).not.toContain(disabled.email);
	}

	// Same request with the opt-in flag proves the omission above is the status filter at work.
	const res = await adminApi.get('/api/admin/member-emails-export?view=all&emailScope=all&includeDisabled=1');
	expect(res.ok()).toBeTruthy();
	const { lines } = await res.json();
	expect(lines).toContain(disabled.email);

	await adminApi.dispose();
});

test('legacy (non-view) email export honours the memberStatus filter', async () => {
	const adminApi = await apiContextFor(admin.email);

	// No `view` param → legacy admin_members_page path, which defaults to memberStatus=enrolled.
	const defaultRes = await adminApi.get('/api/admin/member-emails-export');
	expect(defaultRes.ok()).toBeTruthy();
	const { emails } = await defaultRes.json();
	expect(emails).toContain(enrolled.email);
	expect(emails).not.toContain(disabled.email);

	const disabledRes = await adminApi.get('/api/admin/member-emails-export?memberStatus=disabled');
	expect(disabledRes.ok()).toBeTruthy();
	const disabledBody = await disabledRes.json();
	expect(disabledBody.emails).toContain(disabled.email);
	expect(disabledBody.emails).not.toContain(enrolled.email);

	await adminApi.dispose();
});

test('members CSV export omits disabled members unless includeDisabled is set', async () => {
	const adminApi = await apiContextFor(admin.email);

	const res = await adminApi.get('/api/admin/members-csv?view=all');
	expect(res.ok()).toBeTruthy();
	const csv = await res.text();
	expect(csv).toContain(enrolled.email);
	expect(csv).not.toContain(disabled.email);

	const inclRes = await adminApi.get('/api/admin/members-csv?view=all&includeDisabled=1');
	expect(inclRes.ok()).toBeTruthy();
	const inclCsv = await inclRes.text();
	expect(inclCsv).toContain(disabled.email);

	await adminApi.dispose();
});
