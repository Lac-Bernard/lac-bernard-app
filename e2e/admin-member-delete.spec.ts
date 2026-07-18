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
	admin = await createTestMember({ firstName: 'Admin', lastName: 'DeleteE2E' });
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

test('admin deletes a member with no memberships, leaving a full audit trail', async () => {
	const supabaseAdmin = serviceClient();
	const member = await newMember({ firstName: 'DupeToDelete', lastName: 'E2E' });
	const adminApi = await apiContextFor(admin.email);

	const res = await adminApi.delete(`/api/admin/members/${member.memberId}`);
	expect(res.ok()).toBeTruthy();

	const { data: row } = await supabaseAdmin.from('members').select('id').eq('id', member.memberId).maybeSingle();
	expect(row).toBeNull();

	const getRes = await adminApi.get(`/api/admin/members/${member.memberId}`);
	expect(getRes.status()).toBe(404);

	const { data: auditRows } = await supabaseAdmin
		.from('admin_audit_log')
		.select('metadata')
		.eq('entity_type', 'member')
		.eq('entity_id', member.memberId)
		.eq('action', 'member_delete')
		.order('created_at', { ascending: false })
		.limit(1);
	expect(auditRows).toHaveLength(1);
	const snapshot = auditRows?.[0].metadata?.member as { first_name?: string; last_name?: string; primary_email?: string };
	expect(snapshot?.first_name).toBe('DupeToDelete');
	expect(snapshot?.last_name).toBe('E2E');
	expect(snapshot?.primary_email).toBe(member.email);

	// Deletion already happened via the feature under test — nothing left for afterAll to clean up.
	members = members.filter((m) => m.memberId !== member.memberId);

	await adminApi.dispose();
});

test('admin deleting a member also removes their linked auth user', async () => {
	const supabaseAdmin = serviceClient();
	const member = await newMember({ firstName: 'LinkedDelete', lastName: 'E2E' });

	const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
		email: member.email,
		email_confirm: true,
	});
	expect(createErr).toBeNull();
	const authUserId = created?.user?.id;
	expect(authUserId).toBeTruthy();

	await supabaseAdmin.from('members').update({ user_id: authUserId }).eq('id', member.memberId);

	const adminApi = await apiContextFor(admin.email);
	const res = await adminApi.delete(`/api/admin/members/${member.memberId}`);
	expect(res.ok()).toBeTruthy();

	const { data: fetchedUser } = await supabaseAdmin.auth.admin.getUserById(authUserId as string);
	expect(fetchedUser.user).toBeNull();

	members = members.filter((m) => m.memberId !== member.memberId);

	await adminApi.dispose();
});

test('admin cannot delete a member that has a membership on file', async () => {
	const supabaseAdmin = serviceClient();
	const member = await newMember({ firstName: 'HasMembership', lastName: 'E2E' });
	const adminApi = await apiContextFor(admin.email);

	const createRes = await adminApi.post(`/api/admin/members/${member.memberId}/memberships`, {
		data: { year: currentMembershipYear(), tier: 'associate', initial: 'pending' },
	});
	expect(createRes.ok()).toBeTruthy();

	const deleteRes = await adminApi.delete(`/api/admin/members/${member.memberId}`);
	expect(deleteRes.status()).toBe(409);
	const body = await deleteRes.json();
	expect(body.error).toBe('has_memberships');

	const { data: row } = await supabaseAdmin.from('members').select('id').eq('id', member.memberId).maybeSingle();
	expect(row).not.toBeNull();

	await adminApi.dispose();
});

test('deleting a nonexistent member returns not_found', async () => {
	const adminApi = await apiContextFor(admin.email);

	const res = await adminApi.delete('/api/admin/members/00000000-0000-0000-0000-000000000000');
	expect(res.status()).toBe(404);
	const body = await res.json();
	expect(body.error).toBe('not_found');

	await adminApi.dispose();
});

test('a signed-in non-admin is rejected from deleting a member', async () => {
	const member = await newMember({ firstName: 'NonAdminDelete', lastName: 'E2E' });
	const memberApi = await apiContextFor(member.email);

	const res = await memberApi.delete(`/api/admin/members/${member.memberId}`);
	expect(res.status()).toBe(403);

	await memberApi.dispose();
});
