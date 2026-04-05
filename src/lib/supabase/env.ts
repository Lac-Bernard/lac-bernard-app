function getServerEnv(name: string): string | undefined {
	return import.meta.env?.[name] ?? process.env[name];
}

export function getSupabaseServerEnv(): { url: string; anonKey: string } {
	const url = getServerEnv('PUBLIC_SUPABASE_URL') ?? getServerEnv('SUPABASE_URL');
	const anonKey =
		getServerEnv('PUBLIC_SUPABASE_ANON_KEY') ?? getServerEnv('SUPABASE_ANON_KEY');
	if (!url || !anonKey) {
		throw new Error(
			'Set SUPABASE_URL and SUPABASE_ANON_KEY in .env (optional PUBLIC_* duplicates for client-side use).',
		);
	}
	return { url, anonKey };
}

/** Server-only: used for admin API routes after session is verified. Never expose to the client. */
export function getSupabaseServiceRoleEnv(): { url: string; serviceRoleKey: string } {
	const { url } = getSupabaseServerEnv();
	const serviceRoleKey = getServerEnv('SUPABASE_SERVICE_ROLE_KEY');
	if (!serviceRoleKey) {
		throw new Error('Set SUPABASE_SERVICE_ROLE_KEY in server environment for admin API routes.');
	}
	return { url, serviceRoleKey };
}

/** Server-only. `sk_test_…` (dev) or `sk_live_…` (prod). */
export function getStripeSecretKey(): string {
	const key = getServerEnv('STRIPE_SECRET_KEY');
	if (typeof key !== 'string' || !key.trim()) {
		throw new Error('Set STRIPE_SECRET_KEY in server environment for Stripe Checkout.');
	}
	return key.trim();
}

/** Server-only. `whsec_…` from Stripe Dashboard (prod) or `stripe listen` (local dev). */
export function getStripeWebhookSecret(): string {
	const key = getServerEnv('STRIPE_WEBHOOK_SECRET');
	if (typeof key !== 'string' || !key.trim()) {
		throw new Error('Set STRIPE_WEBHOOK_SECRET in server environment for Stripe webhooks.');
	}
	return key.trim();
}

/** Server-only: same JSON as Sheets sync; used by the public Drive folder browser API. */
export function getGoogleServiceAccountJsonOptional(): string | null {
	const raw = getServerEnv('GOOGLE_SERVICE_ACCOUNT_JSON');
	return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

/** Server-only: Google Sheets spreadsheet id + service account JSON for scheduled syncs. */
export function getGoogleSheetsEnv(): { sheetId: string; serviceAccountJson: string } {
	const sheetId = getServerEnv('GOOGLE_SHEET_ID');
	const serviceAccountJson = getServerEnv('GOOGLE_SERVICE_ACCOUNT_JSON');
	if (typeof sheetId !== 'string' || !sheetId.trim()) {
		throw new Error('Set GOOGLE_SHEET_ID in server environment for Google Sheets sync.');
	}
	if (typeof serviceAccountJson !== 'string' || !serviceAccountJson.trim()) {
		throw new Error(
			'Set GOOGLE_SERVICE_ACCOUNT_JSON in server environment for Google Sheets sync.',
		);
	}
	return {
		sheetId: sheetId.trim(),
		serviceAccountJson: serviceAccountJson.trim(),
	};
}

/** Server-only: bearer secret used to authenticate the cron sync route. */
export function getCronSecret(): string {
	const secret = getServerEnv('CRON_SECRET');
	if (typeof secret !== 'string' || !secret.trim()) {
		throw new Error('Set CRON_SECRET in server environment for scheduled routes.');
	}
	return secret.trim();
}

function parseSummaryRecipients(raw: string | undefined, fallback: string): string[] {
	const s = (raw ?? fallback).trim();
	const parts = s
		.split(',')
		.map((a) => a.trim())
		.filter(Boolean);
	return parts.length > 0 ? parts : [fallback.trim()].filter(Boolean);
}

/** Server-only: SMTP for `/api/cron/membership-admin-daily-summary` (Vercel cron). */
export function getMembershipAdminDailySummaryMailEnv(): {
	host: string;
	port: number;
	secure: boolean;
	user: string;
	pass: string;
	from: string;
	/** One or more To addresses (comma-separated in env is split here). */
	to: string[];
} {
	const host = getServerEnv('SMTP_HOST')?.trim();
	const user = getServerEnv('SMTP_USER')?.trim();
	const pass = getServerEnv('SMTP_PASS')?.trim();
	const from = (getServerEnv('MEMBERSHIP_ADMIN_SUMMARY_FROM') ?? 'bot@lacbernard.ca').trim();
	const to = parseSummaryRecipients(getServerEnv('MEMBERSHIP_ADMIN_SUMMARY_TO'), 'membership@lacbernard.ca');
	const portRaw = getServerEnv('SMTP_PORT');
	const port =
		typeof portRaw === 'string' && /^\d+$/.test(portRaw.trim()) ? parseInt(portRaw.trim(), 10) : 587;
	if (!host) {
		throw new Error('Set SMTP_HOST (and SMTP_USER, SMTP_PASS) for the membership admin daily summary email.');
	}
	if (!user || !pass) {
		throw new Error('Set SMTP_USER and SMTP_PASS for the membership admin daily summary email.');
	}
	const secure =
		(getServerEnv('SMTP_SECURE') ?? '').trim().toLowerCase() === 'true' || port === 465;
	return { host, port, secure, user, pass, from, to };
}
