import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import type { Page } from '@playwright/test';
import { e2eEnv } from './env';

function serviceClient() {
	const { supabaseUrl, supabaseServiceRoleKey } = e2eEnv();
	return createClient(supabaseUrl, supabaseServiceRoleKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
}

function anonClient() {
	const { supabaseUrl, supabaseAnonKey } = e2eEnv();
	return createClient(supabaseUrl, supabaseAnonKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
}

export type TestMember = {
	email: string;
	memberId: string;
};

/** Inserts a `members` row (bypassing RLS) that `claim_member()` will link on first sign-in. */
export async function createTestMember(opts: {
	firstName?: string;
	lastName?: string;
}): Promise<TestMember> {
	const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
	const supabase = serviceClient();
	const { data, error } = await supabase
		.from('members')
		.insert({
			first_name: opts.firstName ?? 'E2E',
			last_name: opts.lastName ?? 'Tester',
			primary_email: email,
			email_opt_in: false,
		})
		.select('id')
		.single();
	if (error || !data) {
		throw new Error(`Failed to seed test member: ${error?.message}`);
	}
	return { email, memberId: data.id as string };
}

/** Deletes the auth user (cascades member/memberships/payments) created for a test run. */
export async function deleteTestMember(member: TestMember): Promise<void> {
	const supabase = serviceClient();
	// Membership/payment rows are FK-restricted, not cascaded, so tear down bottom-up.
	const { data: memberships } = await supabase
		.from('memberships')
		.select('id')
		.eq('member_id', member.memberId);
	const membershipIds = (memberships ?? []).map((m) => m.id as string);
	if (membershipIds.length > 0) {
		await supabase.from('payments').delete().in('membership_id', membershipIds);
		await supabase.from('memberships').delete().in('id', membershipIds);
	}
	await supabase.from('members').delete().eq('id', member.memberId);

	const { data: userList } = await supabase.auth.admin.listUsers();
	const authUser = userList?.users.find((u) => u.email === member.email);
	if (authUser) {
		await supabase.auth.admin.deleteUser(authUser.id);
	}
}

type CapturedCookie = {
	name: string;
	value: string;
	path?: string;
	sameSite?: 'strict' | 'lax' | 'none';
	maxAge?: number;
};

/**
 * Establishes a real Supabase session for `email` without an inbox: `admin.generateLink`
 * (magiclink) returns a one-time `email_otp`, which we redeem via `verifyOtp` — the same
 * server-side call GoTrue performs when a real magic-link is clicked — to get an
 * access/refresh token pair.
 */
async function sessionForEmail(email: string): Promise<{ accessToken: string; refreshToken: string }> {
	const admin = serviceClient();
	// generateLink({type:'magiclink'}) for an email with no existing auth user returns a
	// verification_type of 'signup' instead, which verifyOtp(..., {type:'magiclink'}) then
	// rejects as expired/invalid — pre-create the user so the link is a real magiclink.
	await admin.auth.admin.createUser({ email, email_confirm: true });
	const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
		type: 'magiclink',
		email,
	});
	const emailOtp = linkData?.properties?.email_otp;
	if (linkErr || !emailOtp) {
		throw new Error(`Failed to generate magic link OTP for ${email}: ${linkErr?.message}`);
	}

	const anon = anonClient();
	const { data: verifyData, error: verifyErr } = await anon.auth.verifyOtp({
		email,
		token: emailOtp,
		type: 'magiclink',
	});
	if (verifyErr || !verifyData.session) {
		throw new Error(`Failed to verify OTP for ${email}: ${verifyErr?.message}`);
	}
	return {
		accessToken: verifyData.session.access_token,
		refreshToken: verifyData.session.refresh_token,
	};
}

/**
 * Reuses the app's own `@supabase/ssr` server client to turn an access/refresh token pair into
 * the exact cookies `src/lib/supabase/server.ts` expects to find — rather than re-deriving
 * @supabase/ssr's cookie name/chunking/encoding scheme by hand.
 */
async function cookiesForSession(accessToken: string, refreshToken: string): Promise<CapturedCookie[]> {
	const { supabaseUrl, supabaseAnonKey } = e2eEnv();
	const captured: CapturedCookie[] = [];
	const client = createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll: () => [],
			setAll: (cookiesToSet) => {
				for (const { name, value, options } of cookiesToSet) {
					captured.push({
						name,
						value,
						path: options?.path,
						sameSite: options?.sameSite as CapturedCookie['sameSite'],
						maxAge: options?.maxAge,
					});
				}
			},
		},
	});
	await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
	if (captured.length === 0) {
		throw new Error('@supabase/ssr did not emit any session cookies for the test session.');
	}
	return captured;
}

function toPlaywrightCookies(cookies: CapturedCookie[], baseURL: string) {
	const domain = new URL(baseURL).hostname;
	const sameSiteMap = { strict: 'Strict', lax: 'Lax', none: 'None' } as const;
	return cookies.map((c) => ({
		name: c.name,
		value: c.value,
		domain,
		path: c.path ?? '/',
		sameSite: sameSiteMap[c.sameSite ?? 'lax'],
		expires: c.maxAge ? Math.floor(Date.now() / 1000) + c.maxAge : undefined,
	}));
}

/** Signs a Playwright browser context in as `email` — no inbox, no PKCE redirect chain. */
export async function signInWithMagicLink(page: Page, email: string, next = '/en/membership/account'): Promise<void> {
	const { baseURL } = e2eEnv();
	const { accessToken, refreshToken } = await sessionForEmail(email);
	const cookies = await cookiesForSession(accessToken, refreshToken);
	await page.context().addCookies(toPlaywrightCookies(cookies, baseURL));
	await page.goto(next);
}

/** Same as {@link signInWithMagicLink} but for an API-only Playwright request context. */
export async function sessionCookieHeader(email: string): Promise<string> {
	const { accessToken, refreshToken } = await sessionForEmail(email);
	const cookies = await cookiesForSession(accessToken, refreshToken);
	return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}
