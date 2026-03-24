import { defineMiddleware } from 'astro:middleware';
import {
	getLegacyFrenchRedirect,
	homePathFromLocaleCookie,
	LOCALE_PREFERENCE_COOKIE,
} from './utils/i18n';

const localePrefix = /^\/(en|fr)(\/|$)/;

/**
 * Root `/` is not redirected in `vercel.json` so this middleware runs on Vercel and can read cookies.
 * Legacy French paths + cookie refresh on localized routes match `vercel.json` / dev behavior elsewhere.
 */
export const onRequest = defineMiddleware((context, next) => {
	const pathname = context.url.pathname;

	if (pathname === '/' || pathname === '') {
		const pref = context.cookies.get(LOCALE_PREFERENCE_COOKIE)?.value;
		return context.redirect(homePathFromLocaleCookie(pref), 302);
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
