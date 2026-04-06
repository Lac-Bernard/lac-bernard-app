export const prerender = false;
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { defaultMemberAccountPath, memberSignInPathForNext } from '../../../lib/members/i18n';

function safeNextParam(value: string | null): string {
	if (!value || !value.startsWith('/') || value.startsWith('//')) {
		return defaultMemberAccountPath;
	}
	return value;
}

function isOtpExpiredCallback(url: URL): boolean {
	const code = url.searchParams.get('error_code') ?? '';
	const err = url.searchParams.get('error') ?? '';
	const desc = url.searchParams.get('error_description') ?? '';
	return (
		code === 'otp_expired' ||
		err === 'otp_expired' ||
		desc.toLowerCase().includes('otp_expired')
	);
}

function isLikelyExpiredExchangeMessage(message: string): boolean {
	const m = message.toLowerCase();
	return (
		m.includes('expired') ||
		m.includes('otp_expired') ||
		m.includes('flow_state') ||
		m.includes('invalid grant')
	);
}

function redirectToSignIn(
	redirect: (path: string) => Response,
	next: string,
	kind: 'link_expired' | 'auth_failed',
): Response {
	const base = memberSignInPathForNext(next);
	const params = new URLSearchParams();
	params.set('next', next);
	params.set('signin_error', kind);
	return redirect(`${base}?${params.toString()}`);
}

export const GET: APIRoute = async ({ url, request, cookies, redirect }) => {
	const code = url.searchParams.get('code');
	const next = safeNextParam(url.searchParams.get('next'));

	if (!code) {
		if (isOtpExpiredCallback(url)) {
			return redirectToSignIn(redirect, next, 'link_expired');
		}
		return redirectToSignIn(redirect, next, 'auth_failed');
	}

	const supabase = createSupabaseServerClient(request, cookies);
	const { error } = await supabase.auth.exchangeCodeForSession(code);

	if (error) {
		if (isLikelyExpiredExchangeMessage(error.message)) {
			return redirectToSignIn(redirect, next, 'link_expired');
		}
		return redirectToSignIn(redirect, next, 'auth_failed');
	}

	return redirect(next);
};
