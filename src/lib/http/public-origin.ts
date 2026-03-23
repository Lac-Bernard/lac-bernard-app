/**
 * Public browser-facing origin for redirects (magic link, OAuth, etc.).
 * On Vercel, `request.url` is often an internal URL (e.g. localhost). `import.meta.env.SITE`
 * is not always present in API route bundles, so we prefer env, proxy headers, then `Host`.
 */
const LOCAL_HOST_RE = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

function originFromHostHeader(request: Request, host: string): string {
	const h = host.split(',')[0].trim();
	const rawProto = request.headers.get('x-forwarded-proto') ?? 'https';
	const proto = rawProto.split(',')[0].trim() || 'https';
	return `${proto}://${h}`;
}

export function getPublicRequestOrigin(request: Request): string {
	const fromEnv = import.meta.env.PUBLIC_SITE_URL;
	if (typeof fromEnv === 'string' && fromEnv.trim()) {
		return new URL(fromEnv.trim()).origin;
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
