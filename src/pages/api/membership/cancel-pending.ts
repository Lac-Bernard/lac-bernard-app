export const prerender = false;
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { findMemberByAuthEmail } from '../../../lib/members/memberLookup';

export const POST: APIRoute = async ({ request, cookies }) => {
	const supabase = createSupabaseServerClient(request, cookies);
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();

	if (userErr || !user?.email) {
		return new Response(JSON.stringify({ error: 'unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let body: { membershipId?: string };
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'invalid_json' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const membershipId = typeof body.membershipId === 'string' ? body.membershipId.trim() : '';
	if (!membershipId) {
		return new Response(JSON.stringify({ error: 'missing_id' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const member = await findMemberByAuthEmail(supabase, user.email);
	if (!member) {
		return new Response(JSON.stringify({ error: 'no_member' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const { data: deleted, error: delErr } = await supabase
		.from('memberships')
		.delete()
		.eq('id', membershipId)
		.eq('member_id', member.id)
		.eq('status', 'pending')
		.select('id');

	if (delErr) {
		return new Response(JSON.stringify({ error: 'delete_failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (!deleted?.length) {
		return new Response(JSON.stringify({ error: 'not_found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
