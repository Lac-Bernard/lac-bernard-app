import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { findMemberByAuthEmail } from '../../../lib/members/memberLookup';
import {
	normalizeEmail,
	parseMemberProfilePayload,
	payloadToRow,
	payloadToUpdate,
} from '../../../lib/members/profilePayload';

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

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'invalid_json' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const parsed = parseMemberProfilePayload(body);
	if (!parsed.ok) {
		return new Response(JSON.stringify({ error: parsed.error }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const existing = await findMemberByAuthEmail(supabase, user.email);
	if (existing) {
		return new Response(JSON.stringify({ error: 'already_member' }), {
			status: 409,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const primaryEmail = normalizeEmail(user.email);
	if (!primaryEmail) {
		return new Response(JSON.stringify({ error: 'invalid_primary_email' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const row = payloadToRow(parsed.value, {
		user_id: user.id,
		primary_email: primaryEmail,
	});

	const { data: inserted, error: insErr } = await supabase
		.from('members')
		.insert(row)
		.select('id')
		.single();

	if (insErr || !inserted) {
		return new Response(JSON.stringify({ error: 'create_failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(JSON.stringify({ ok: true, id: inserted.id }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};

export const PATCH: APIRoute = async ({ request, cookies }) => {
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

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'invalid_json' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const parsed = parseMemberProfilePayload(body);
	if (!parsed.ok) {
		return new Response(JSON.stringify({ error: parsed.error }), {
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

	const email = normalizeEmail(user.email);
	if (!email) {
		return new Response(JSON.stringify({ error: 'invalid_primary_email' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const update = payloadToUpdate(parsed.value, email);

	const { error: upErr } = await supabase.from('members').update(update).eq('id', member.id);

	if (upErr) {
		return new Response(JSON.stringify({ error: 'update_failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
