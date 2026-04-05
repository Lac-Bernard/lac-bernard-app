export const prerender = false;
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getPublicRequestOrigin } from '../../../lib/http/public-origin';
import { findMemberByAuthEmail } from '../../../lib/members/memberLookup';
import {
	membershipCentsForTier,
	parseDonationDollars,
	parseDonationNote,
} from '../../../lib/membership/stripeCheckout';
import { getMembershipCalendarYear } from '../../../lib/members/membershipYear';
import { memberPaths, type MemberLocale } from '../../../lib/members/i18n';
import { getStripeSecretKey } from '../../../lib/supabase/env';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies }) => {
	let stripe: Stripe;
	try {
		stripe = new Stripe(getStripeSecretKey());
	} catch {
		return new Response(JSON.stringify({ error: 'stripe_misconfigured' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' },
		});
	}

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

	let body: {
		membershipId?: string;
		donationDollars?: unknown;
		donationNote?: unknown;
		locale?: string;
	};
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

	const locale: MemberLocale = body.locale === 'fr' ? 'fr' : 'en';
	const donationDollars = parseDonationDollars(body.donationDollars);
	if (donationDollars === null) {
		return new Response(JSON.stringify({ error: 'invalid_donation' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const donationCents = Math.round(donationDollars * 100);

	const donationNote = parseDonationNote(body.donationNote);
	if (donationNote === null) {
		return new Response(JSON.stringify({ error: 'invalid_donation_note' }), {
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

	const { data: memberRow, error: memberErr } = await supabase
		.from('members')
		.select('stripe_customer_id')
		.eq('id', member.id)
		.maybeSingle();

	if (memberErr) {
		return new Response(JSON.stringify({ error: 'lookup_failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const currentYear = getMembershipCalendarYear();

	const { data: ms, error: msErr } = await supabase
		.from('memberships')
		.select('id, member_id, year, tier, status')
		.eq('id', membershipId)
		.maybeSingle();

	if (msErr || !ms) {
		return new Response(JSON.stringify({ error: 'not_found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (ms.member_id !== member.id) {
		return new Response(JSON.stringify({ error: 'forbidden' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (ms.status !== 'pending' || ms.year !== currentYear) {
		return new Response(JSON.stringify({ error: 'invalid_membership' }), {
			status: 409,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const membershipCents = membershipCentsForTier(ms.tier);
	if (membershipCents === null) {
		return new Response(JSON.stringify({ error: 'invalid_tier' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (ms.tier === 'voting') {
		const { data: elig, error: eligErr } = await supabase.rpc('membership_voting_eligibility', {
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

	const origin = getPublicRequestOrigin(request);
	const accountPath = memberPaths[locale].account;
	const successUrl = `${origin}/api/membership/checkout-success?session_id={CHECKOUT_SESSION_ID}&locale=${locale}`;
	const cancelUrl = `${origin}${accountPath}?checkout=cancelled`;

	const membershipLabel = locale === 'fr' ? 'Cotisation' : 'Membership';
	const membershipDesc =
		locale === 'fr'
			? `Année ${String(currentYear)}`
			: `Year ${String(currentYear)}`;

	const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
		{
			quantity: 1,
			price_data: {
				currency: 'cad',
				unit_amount: membershipCents,
				product_data: {
					name: membershipLabel,
					description: membershipDesc,
				},
			},
		},
	];

	if (donationCents > 0) {
		const donationLabel = locale === 'fr' ? 'Don' : 'Donation';
		const noteDesc =
			donationNote.length > 0
				? donationNote.length > 180
					? `${donationNote.slice(0, 177)}…`
					: donationNote
				: undefined;
		lineItems.push({
			quantity: 1,
			price_data: {
				currency: 'cad',
				unit_amount: donationCents,
				product_data: {
					name: donationLabel,
					...(noteDesc ? { description: noteDesc } : {}),
				},
			},
		});
	}

	const sessionParams: Stripe.Checkout.SessionCreateParams = {
		mode: 'payment',
		line_items: lineItems,
		success_url: successUrl,
		cancel_url: cancelUrl,
		client_reference_id: ms.id,
		metadata: {
			membership_id: ms.id,
			member_id: member.id,
			tier: ms.tier,
			membership_amount_cents: String(membershipCents),
			donation_cents: String(donationCents),
			donation_note: donationNote,
		},
		locale: locale === 'fr' ? 'fr' : 'en',
	};

	const existingCustomer = memberRow?.stripe_customer_id?.trim();
	if (existingCustomer) {
		sessionParams.customer = existingCustomer;
	} else {
		sessionParams.customer_creation = 'always';
		if (user.email) sessionParams.customer_email = user.email;
	}

	try {
		const session = await stripe.checkout.sessions.create(sessionParams);
		if (!session.url) {
			return new Response(JSON.stringify({ error: 'no_session_url' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		return new Response(JSON.stringify({ url: session.url }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (e) {
		console.error('Stripe checkout.sessions.create failed:', e);
		return new Response(JSON.stringify({ error: 'stripe_error' }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
