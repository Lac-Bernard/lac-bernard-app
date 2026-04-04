export const prerender = false;
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { defaultMemberAccountPath } from '../../../lib/members/i18n';

function safeNextParam(value: string | null): string {
	if (!value || !value.startsWith('/') || value.startsWith('//')) {
		return defaultMemberAccountPath;
	}
	return value;
}

export const GET: APIRoute = async ({ url, request, cookies, redirect }) => {
	const code = url.searchParams.get('code');
	const next = safeNextParam(url.searchParams.get('next'));

	if (!code) {
		return new Response('Missing OAuth code', { status: 400 });
	}

	const supabase = createSupabaseServerClient(request, cookies);
	const { error } = await supabase.auth.exchangeCodeForSession(code);

	if (error) {
		return new Response(error.message, { status: 500 });
	}

	return redirect(next);
};
