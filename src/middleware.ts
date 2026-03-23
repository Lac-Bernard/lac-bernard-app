import { defineMiddleware } from 'astro:middleware';
import { getLegacyFrenchRedirect } from './utils/i18n';

/** Applies the same legacy French → `/fr/...` rules as `vercel.json` (which does not run in `astro dev`). */
export const onRequest = defineMiddleware((context, next) => {
	const target = getLegacyFrenchRedirect(context.url.pathname);
	if (target) {
		return context.redirect(target, 308);
	}
	return next();
});
