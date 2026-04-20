import { defineMiddleware } from 'astro:middleware';
import { isAppAdmin } from './lib/auth/admin';
import { memberSignInPathForNext } from './lib/members/i18n';
import { createSupabaseServerClient } from './lib/supabase/server';
import {
	getLegacyFrenchRedirect,
	homePathFromLocaleCookie,
	LOCALE_PREFERENCE_COOKIE,
} from './utils/i18n';

const localePrefix = /^\/(en|fr)(\/|$)/;
const memberAdminPrefix = /^\/(en|fr)\/membership\/admin(\/|$)/;

/**
 * Root `/` is not redirected in `vercel.json` so this middleware runs on Vercel and can read cookies.
 * Legacy French paths + cookie refresh on localized routes match `vercel.json` / dev behavior elsewhere.
 */
export const onRequest = defineMiddleware(async (context, next) => {
	const pathname = context.url.pathname;

	if (pathname === '/' || pathname === '') {
		const pref = context.cookies.get(LOCALE_PREFERENCE_COOKIE)?.value;
		return context.redirect(homePathFromLocaleCookie(pref), 302);
	}

	// Guard membership admin pages (pages, not APIs) with a single auth check.
	// - Unauthenticated: redirect to sign-in with `next`.
	// - Signed in but not admin: sign out (so they can switch accounts) and redirect with a notice.
	if (memberAdminPrefix.test(pathname)) {
		const supabase = createSupabaseServerClient(context.request, context.cookies);
		const {
			data: { user },
		} = await supabase.auth.getUser();

		const nextUrl = `${context.url.pathname}${context.url.search}`;
		const signInPath = memberSignInPathForNext(nextUrl);

		if (!user) {
			return context.redirect(`${signInPath}?next=${encodeURIComponent(nextUrl)}`, 302);
		}

		if (!isAppAdmin(user)) {
			const account = user.email ?? '';
			await supabase.auth.signOut();
			const params = new URLSearchParams();
			params.set('next', nextUrl);
			params.set('signin_error', 'not_admin');
			params.set('account', account);
			return context.redirect(`${signInPath}?${params.toString()}`, 302);
		}
	}

	const target = getLegacyFrenchRedirect(pathname);
	if (target) {
		return context.redirect(target, 308);
	}

	const match = pathname.match(localePrefix);
	if (match) {
		context.cookies.set(LOCALE_PREFERENCE_COOKIE, match[1], {
			path: '/',
			maxAge: 60 * 60 * 24 * 365,
			sameSite: 'lax',
			secure: import.meta.env.PROD,
		});
	}

	return next();
});
