export const prerender = false;
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { findMemberByAuthEmail } from '../../../lib/members/memberLookup';
import { getMembershipCalendarYear } from '../../../lib/members/membershipYear';

const TIERS = new Set(['general', 'associate']);

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

	let body: { tier?: string };
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'invalid_json' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const tier = typeof body.tier === 'string' ? body.tier.trim() : '';
	if (!TIERS.has(tier)) {
		return new Response(JSON.stringify({ error: 'invalid_tier' }), {
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

	const currentYear = getMembershipCalendarYear();

	const { data: existing, error: exErr } = await supabase
		.from('memberships')
		.select('id, status')
		.eq('member_id', member.id)
		.eq('year', currentYear)
		.maybeSingle();

	if (exErr) {
		return new Response(JSON.stringify({ error: 'lookup_failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (existing) {
		if (existing.status === 'active') {
			return new Response(JSON.stringify({ error: 'already_active' }), {
				status: 409,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		return new Response(JSON.stringify({ error: 'already_pending' }), {
			status: 409,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (tier === 'general') {
		const { data: elig, error: eligErr } = await supabase.rpc('membership_general_eligibility', {
			p_member_id: member.id,
			p_year: currentYear,
		});
		if (eligErr) {
			return new Response(JSON.stringify({ error: 'eligibility_failed' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		const result = elig as { ok?: boolean; error?: string } | null;
		if (!result?.ok) {
			const code = result?.error ?? 'unknown';
			const status =
				code === 'forbidden' ? 403 : code === 'not_found' ? 404 : 409;
			return new Response(JSON.stringify({ error: code }), {
				status,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	}

	const { data: inserted, error: insErr } = await supabase
		.from('memberships')
		.insert({ member_id: member.id, year: currentYear, tier, status: 'pending' })
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
