import { createServerClient } from '@supabase/ssr';
import { parse, serialize, type SerializeOptions } from 'cookie';
import { getSupabaseServerEnv } from './env';

/** Matches Astro’s `Astro.cookies` API used by Supabase session cookies. */
type ResponseCookies = {
	set(name: string, value: string, options?: Record<string, unknown>): void;
	delete(name: string, options?: Record<string, unknown>): void;
};

type PendingCookie = { name: string; value: string; options?: Record<string, unknown> };

function cookiesFromHeader(header: string | null): { name: string; value: string }[] {
	const parsed = parse(header ?? '');
	return Object.entries(parsed).map(([name, value]) => ({
		name,
		value: value ?? '',
	}));
}

function flushPendingToAstro(pending: PendingCookie[], cookies: ResponseCookies) {
	for (const { name, value, options } of pending) {
		if (value) {
			cookies.set(name, value, options);
		} else {
			cookies.delete(name, options);
		}
	}
	pending.length = 0;
}

function setCookieHeaderLine(name: string, value: string, options?: Record<string, unknown>): string {
	const o = options as SerializeOptions | undefined;
	if (value) {
		return serialize(name, value, o);
	}
	return serialize(name, '', { ...o, maxAge: 0 });
}

/**
 * Supabase client for `.astro` pages that may call `getUser()` then redirect.
 * Deferred `Set-Cookie` writes avoid committing the response before `Astro.redirect` / `Response.redirect`.
 */
export function createSupabasePageClient(request: Request, cookies: ResponseCookies) {
	const { url, anonKey } = getSupabaseServerEnv();
	const pending: PendingCookie[] = [];

	const supabase = createServerClient(url, anonKey, {
		cookies: {
			getAll() {
				return cookiesFromHeader(request.headers.get('Cookie'));
			},
			setAll(cookiesToSet) {
				for (const { name, value, options } of cookiesToSet) {
					pending.push({ name, value: value ?? '', options: options as Record<string, unknown> });
				}
			},
		},
	});

	return {
		supabase,
		flushCookies() {
			flushPendingToAstro(pending, cookies);
		},
		redirectWithCookies(location: string, status = 302) {
			const headers = new Headers();
			headers.set('Location', location);
			for (const { name, value, options } of pending) {
				headers.append('Set-Cookie', setCookieHeaderLine(name, value, options));
			}
			pending.length = 0;
			return new Response(null, { status, headers });
		},
	};
}

/** Cookie-backed Supabase client for Astro pages and API routes (PKCE session). */
export function createSupabaseServerClient(request: Request, cookies: ResponseCookies) {
	const { url, anonKey } = getSupabaseServerEnv();
	return createServerClient(url, anonKey, {
		cookies: {
			getAll() {
				return cookiesFromHeader(request.headers.get('Cookie'));
			},
			setAll(cookiesToSet) {
				for (const { name, value, options } of cookiesToSet) {
					if (value) {
						cookies.set(name, value, options);
					} else {
						cookies.delete(name, options);
					}
				}
			},
		},
	});
}
