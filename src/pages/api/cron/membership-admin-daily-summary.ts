/**
 * Vercel Cron (see vercel.json): sends one plain-text email to membership@lacbernard.ca.
 * Auth: Authorization: Bearer CRON_SECRET (same as other cron routes).
 */
import type { APIContext, APIRoute } from 'astro';
import {
	buildMembershipAdminDailySummaryText,
	parseAdminDailyMembershipSummary,
	sendMembershipAdminDailySummaryEmail,
} from '../../../lib/email/membershipAdminDailySummary';
import { getPublicRequestOrigin } from '../../../lib/http/public-origin';
import { getCronSecret } from '../../../lib/supabase/env';
import { createSupabaseServiceRoleClient } from '../../../lib/supabase/service';

function isAuthorized(request: Request): boolean {
	try {
		const expected = `Bearer ${getCronSecret()}`;
		return request.headers.get('authorization') === expected;
	} catch {
		return false;
	}
}

async function handleDailySummary({ request }: APIContext): Promise<Response> {
	if (!isAuthorized(request)) {
		return new Response(JSON.stringify({ error: 'unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const supabase = createSupabaseServiceRoleClient();
	const { data: raw, error: rpcErr } = await supabase.rpc('admin_daily_membership_summary');

	if (rpcErr) {
		console.error('admin_daily_membership_summary RPC failed:', rpcErr.message);
		return new Response(JSON.stringify({ error: 'rpc_failed', detail: rpcErr.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const counts = parseAdminDailyMembershipSummary(raw);
	if (!counts) {
		return new Response(JSON.stringify({ error: 'invalid_summary_payload' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const origin = getPublicRequestOrigin(request);
	const adminEnUrl = `${origin}/en/membership/admin`;
	const adminFrUrl = `${origin}/fr/membership/admin`;
	const text = buildMembershipAdminDailySummaryText(counts, adminEnUrl, adminFrUrl);
	const subject = `Lac Bernard — membership admin summary · ${counts.toronto_report_date || 'daily'}`;

	try {
		await sendMembershipAdminDailySummaryEmail(text, subject);
	} catch (e) {
		console.error('Membership admin daily summary email failed:', e);
		return new Response(JSON.stringify({ error: 'email_failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(
		JSON.stringify({
			ok: true,
			pending_memberships: counts.pending_memberships,
			new_members_awaiting_verification: counts.new_members_awaiting_verification,
			memberships_activated_previous_toronto_day: counts.memberships_activated_previous_toronto_day,
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json' } },
	);
}

export const GET: APIRoute = handleDailySummary;
export const POST: APIRoute = handleDailySummary;
