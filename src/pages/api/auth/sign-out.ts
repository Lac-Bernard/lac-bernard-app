export const prerender = false;
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { defaultMemberSignInPath } from '../../../lib/members/i18n';

function safeRedirectPath(value: unknown, fallback: string): string {
	if (typeof value !== 'string') return fallback;
	return value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const supabase = createSupabaseServerClient(request, cookies);
	await supabase.auth.signOut();

	const fallback = defaultMemberSignInPath;
	const contentType = request.headers.get('content-type') ?? '';

	if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
		const form = await request.formData();
		const to = safeRedirectPath(form.get('redirect_to'), fallback);
		return redirect(to);
	}

	try {
		const clone = request.clone();
		const body = await clone.json();
		const to = safeRedirectPath(body?.redirect_to, fallback);
		return redirect(to);
	} catch {
		return redirect(fallback);
	}
};
