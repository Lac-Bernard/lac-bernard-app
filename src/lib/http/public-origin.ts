/**
 * Public browser-facing origin for redirects (magic link, OAuth, etc.).
 * On Vercel, `request.url` is often an internal URL (e.g. localhost). `import.meta.env.SITE`
 * is not always present in API route bundles, so we prefer env, proxy headers, then `Host`.
 *
 * Prefer `process.env.PUBLIC_SITE_URL` on the server: Vite inlines `import.meta.env.PUBLIC_*`
 * at **build** time, so a var added only in the Vercel dashboard after a build is still empty
 * in the bundle until you rebuild — but `process.env` is filled at **runtime** on each deploy.
 */
const LOCAL_HOST_RE = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

function readCanonicalSiteUrlFromEnv(): string | undefined {
	// Bracket access so Vite does not replace unknown `process.env.*` at build time with `undefined`.
	if (typeof process !== 'undefined') {
		const pub = process.env['PUBLIC_SITE_URL']?.trim();
		if (pub) return pub;
		const siteOnly = process.env['SITE_URL']?.trim();
		if (siteOnly) return siteOnly;
	}
	const built = import.meta.env.PUBLIC_SITE_URL;
	if (typeof built === 'string' && built.trim()) return built.trim();
	return undefined;
}

function originFromHostHeader(request: Request, host: string): string {
	const h = host.split(',')[0].trim();
	const rawProto = request.headers.get('x-forwarded-proto') ?? 'https';
	const proto = rawProto.split(',')[0].trim() || 'https';
	return `${proto}://${h}`;
}

export function getPublicRequestOrigin(request: Request): string {
	const fromEnv = readCanonicalSiteUrlFromEnv();
	if (fromEnv) {
		return new URL(fromEnv).origin;
	}

	const forwardedHost = request.headers.get('x-forwarded-host');
	if (forwardedHost) {
		return originFromHostHeader(request, forwardedHost);
	}

	const hostHeader = request.headers.get('host');
	if (hostHeader && !LOCAL_HOST_RE.test(hostHeader.split(',')[0].trim())) {
		return originFromHostHeader(request, hostHeader);
	}

	if (import.meta.env.DEV) {
		return new URL(request.url).origin;
	}

	const site = import.meta.env.SITE;
	if (typeof site === 'string' && site.length > 0) {
		return new URL(site).origin;
	}

	return new URL(request.url).origin;
}
