import nodemailer from 'nodemailer';
import { getMembershipAdminDailySummaryMailEnv } from '../supabase/env';

export type AdminDailyMembershipSummaryCounts = {
	pending_memberships: number;
	new_members_awaiting_verification: number;
	memberships_activated_previous_toronto_day: number;
	toronto_report_date: string;
	toronto_previous_date_for_activations: string;
};

function asNonNegativeInt(v: unknown, fallback = 0): number {
	const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
	return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function parseAdminDailyMembershipSummary(data: unknown): AdminDailyMembershipSummaryCounts | null {
	if (data === null || typeof data !== 'object') return null;
	const o = data as Record<string, unknown>;
	return {
		pending_memberships: asNonNegativeInt(o.pending_memberships),
		new_members_awaiting_verification: asNonNegativeInt(o.new_members_awaiting_verification),
		memberships_activated_previous_toronto_day: asNonNegativeInt(o.memberships_activated_previous_toronto_day),
		toronto_report_date: typeof o.toronto_report_date === 'string' ? o.toronto_report_date : '',
		toronto_previous_date_for_activations:
			typeof o.toronto_previous_date_for_activations === 'string' ? o.toronto_previous_date_for_activations : '',
	};
}

export function buildMembershipAdminDailySummaryText(
	counts: AdminDailyMembershipSummaryCounts,
	adminEnUrl: string,
	adminFrUrl: string,
): string {
	const report = counts.toronto_report_date || '(date unknown)';
	const prev = counts.toronto_previous_date_for_activations || '(date unknown)';
	return [
		`Lac Bernard — membership admin (daily)`,
		``,
		`Report morning (America/Toronto): ${report}`,
		``,
		`Pending memberships (all years): ${counts.pending_memberships}`,
		`New members awaiting verification: ${counts.new_members_awaiting_verification}`,
		`Memberships activated previous calendar day (${prev}, Toronto): ${counts.memberships_activated_previous_toronto_day}`,
		``,
		`Admin (English):`,
		adminEnUrl,
		``,
		`Admin (French):`,
		adminFrUrl,
		``,
	].join('\n');
}

export async function sendMembershipAdminDailySummaryEmail(text: string, subject: string): Promise<void> {
	const { host, port, secure, user, pass, from, to } = getMembershipAdminDailySummaryMailEnv();
	const transporter = nodemailer.createTransport({
		host,
		port,
		secure,
		auth: { user, pass },
	});
	await transporter.sendMail({
		from,
		to,
		subject,
		text,
	});
}
