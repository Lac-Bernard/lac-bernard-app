import type { APIRoute } from 'astro';
import { getPublicRequestOrigin } from '../../../lib/http/public-origin';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { defaultMemberAccountPath } from '../../../lib/members/i18n';

export const POST: APIRoute = async ({ request, cookies }) => {
	let body: { email?: string; next?: string };
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const email = typeof body.email === 'string' ? body.email.trim() : '';
	const rawNext = typeof body.next === 'string' ? body.next.trim() : '';
	const next =
		rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : defaultMemberAccountPath;

	if (!email) {
		return new Response(JSON.stringify({ error: 'Email is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const origin = getPublicRequestOrigin(request);
	const supabase = createSupabaseServerClient(request, cookies);

	const { error } = await supabase.auth.signInWithOtp({
		email,
		options: {
			emailRedirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
		},
	});

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
