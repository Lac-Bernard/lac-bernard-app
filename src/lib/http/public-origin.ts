/**
 * Public browser-facing origin for redirects (magic link, OAuth, etc.).
 * Prefer proxy headers on Vercel — `request.url` can be wrong for serverless requests.
 */
export function getPublicRequestOrigin(request: Request): string {
	const forwardedHost = request.headers.get('x-forwarded-host');
	if (forwardedHost) {
		const host = forwardedHost.split(',')[0].trim();
		const rawProto = request.headers.get('x-forwarded-proto') ?? 'https';
		const proto = rawProto.split(',')[0].trim() || 'https';
		return `${proto}://${host}`;
	}

	const site = import.meta.env.SITE;
	if (typeof site === 'string' && site.length > 0) {
		return new URL(site).origin;
	}

	return new URL(request.url).origin;
}
