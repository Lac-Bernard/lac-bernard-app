/**
 * Origin for Supabase `emailRedirectTo`. Set Supabase Auth “Site URL” + redirect allow list to the same site.
 *
 * Optional `PUBLIC_SITE_URL` in Vercel / `.env`. If unset, uses proxy `Host` headers unless they are
 * localhost (Vercel can send `x-forwarded-host: localhost:4321`). Keep `SITE_ORIGIN` in sync with
 * `astro.config` → `site`.
 */
const SITE_ORIGIN = 'https://lacbernard.ca';

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

function isLocalHost(host: string): boolean {
	return LOCAL_HOST.test(host.split(',')[0].trim());
}

function originFromProxy(request: Request, host: string): string {
	const h = host.split(',')[0].trim();
	const proto =
		(request.headers.get('x-forwarded-proto') ?? 'https').split(',')[0].trim() || 'https';
	return `${proto}://${h}`;
}

export function getPublicRequestOrigin(request: Request): string {
	if (typeof process !== 'undefined') {
		const v = process.env['PUBLIC_SITE_URL']?.trim();
		if (v) return new URL(v).origin;
	}
	const pub = import.meta.env.PUBLIC_SITE_URL;
	if (typeof pub === 'string' && pub.trim()) return new URL(pub.trim()).origin;

	const xf = request.headers.get('x-forwarded-host');
	if (xf && !isLocalHost(xf)) return originFromProxy(request, xf);

	const host = request.headers.get('host');
	if (host && !isLocalHost(host)) return originFromProxy(request, host);

	if (import.meta.env.DEV) return new URL(request.url).origin;

	const site = import.meta.env.SITE;
	if (typeof site === 'string' && site.trim()) {
		try {
			return new URL(site).origin;
		} catch {
			/* ignore */
		}
	}

	const fromRequest = new URL(request.url).origin;
	if (!import.meta.env.DEV && isLocalHost(new URL(fromRequest).host)) return SITE_ORIGIN;
	return fromRequest;
}
