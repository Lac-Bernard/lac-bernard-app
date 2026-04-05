export const prerender = false;
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getPublicRequestOrigin } from '../../../lib/http/public-origin';
import { fulfillMembershipFromCheckoutSession } from '../../../lib/membership/fulfillStripeCheckoutSession';
import { findMemberByAuthEmail } from '../../../lib/members/memberLookup';
import { memberPaths, type MemberLocale } from '../../../lib/members/i18n';
import { getStripeSecretKey } from '../../../lib/supabase/env';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

function accountFlashUrl(origin: string, locale: MemberLocale, flash: 'success' | 'error'): string {
	const path = memberPaths[locale].account;
	return `${origin}${path}?checkout=${flash}`;
}

export const GET: APIRoute = async ({ request, cookies, url }) => {
	const origin = getPublicRequestOrigin(request);
	const localeParam = url.searchParams.get('locale');
	const locale: MemberLocale = localeParam === 'fr' ? 'fr' : 'en';
	const paths = memberPaths[locale];

	const sessionId = url.searchParams.get('session_id')?.trim() ?? '';
	if (!sessionId.startsWith('cs_')) {
		return Response.redirect(accountFlashUrl(origin, locale, 'error'), 302);
	}

	const supabase = createSupabaseServerClient(request, cookies);
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();

	if (userErr || !user?.email) {
		const returnTo = `${origin}/api/membership/checkout-success?session_id=${encodeURIComponent(sessionId)}&locale=${locale}`;
		return Response.redirect(`${origin}${paths.signIn}?next=${encodeURIComponent(returnTo)}`, 302);
	}

	const member = await findMemberByAuthEmail(supabase, user.email);
	if (!member) {
		return Response.redirect(accountFlashUrl(origin, locale, 'error'), 302);
	}

	let stripe: Stripe;
	try {
		stripe = new Stripe(getStripeSecretKey());
	} catch {
		return Response.redirect(accountFlashUrl(origin, locale, 'error'), 302);
	}

	let session: Stripe.Checkout.Session;
	try {
		session = await stripe.checkout.sessions.retrieve(sessionId, {
			expand: ['payment_intent'],
		});
	} catch (e) {
		console.error('checkout-success: sessions.retrieve failed', e);
		return Response.redirect(accountFlashUrl(origin, locale, 'error'), 302);
	}

	const metaMemberId = session.metadata?.member_id;
	if (typeof metaMemberId !== 'string' || metaMemberId !== member.id) {
		console.error('checkout-success: member_id mismatch');
		return Response.redirect(accountFlashUrl(origin, locale, 'error'), 302);
	}

	const outcome = await fulfillMembershipFromCheckoutSession(session);

	if (outcome.code === 'fulfilled') {
		return Response.redirect(accountFlashUrl(origin, locale, 'success'), 302);
	}

	if (outcome.code === 'rpc_declined') {
		const err = (outcome.result as { error?: string } | null)?.error;
		if (err === 'not_pending') {
			return Response.redirect(accountFlashUrl(origin, locale, 'success'), 302);
		}
		return Response.redirect(accountFlashUrl(origin, locale, 'error'), 302);
	}

	if (outcome.code === 'rpc_failed') {
		return Response.redirect(accountFlashUrl(origin, locale, 'error'), 302);
	}

	return Response.redirect(accountFlashUrl(origin, locale, 'error'), 302);
};
