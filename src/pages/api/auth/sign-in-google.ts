export const prerender = false;
import type { APIRoute } from 'astro';
import { getPublicRequestOrigin } from '../../../lib/http/public-origin';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { defaultMemberAccountPath } from '../../../lib/members/i18n';

function safeNextParam(value: string | null): string {
	if (!value || !value.startsWith('/') || value.startsWith('//')) {
		return defaultMemberAccountPath;
	}
	return value;
}

export const GET: APIRoute = async ({ url, request, cookies, redirect }) => {
	const next = safeNextParam(url.searchParams.get('next'));
	const origin = getPublicRequestOrigin(request);
	const redirectTo = `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`;

	const supabase = createSupabaseServerClient(request, cookies);
	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: { redirectTo },
	});

	if (error || !data.url) {
		return new Response(error?.message ?? 'Could not start Google sign-in', { status: 500 });
	}

	return redirect(data.url);
};
