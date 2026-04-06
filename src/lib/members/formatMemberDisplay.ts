import type { MemberLocale } from './i18n';

const localeTag: Record<MemberLocale, string> = {
	en: 'en-CA',
	fr: 'fr-CA',
};

/**
 * Format a Postgres `date` (`YYYY-MM-DD`) or timestamp for member-facing UI.
 * Avoids `new Date("YYYY-MM-DD")` UTC parsing (wrong calendar day in Western zones).
 */
export function formatMemberLocaleDate(
	locale: MemberLocale,
	value: string | null | undefined,
): string {
	if (value == null || value === '') return '—';
	const s = value.trim();
	const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
	if (dateOnly) {
		const y = Number(dateOnly[1]);
		const mo = Number(dateOnly[2]) - 1;
		const d = Number(dateOnly[3]);
		if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return s;
		return new Date(y, mo, d).toLocaleDateString(localeTag[locale], { dateStyle: 'medium' });
	}
	try {
		const dt = new Date(s);
		if (Number.isNaN(dt.getTime())) return s;
		return dt.toLocaleDateString(localeTag[locale], { dateStyle: 'medium' });
	} catch {
		return s;
	}
}

function toNumber(n: unknown): number | null {
	if (n == null) return null;
	if (typeof n === 'number') return Number.isFinite(n) ? n : null;
	const v = parseFloat(String(n));
	return Number.isFinite(v) ? v : null;
}

/** CAD for member tables (numeric / Postgres decimal from Supabase). */
export function formatMemberCad(locale: MemberLocale, value: unknown): string {
	const n = toNumber(value);
	if (n == null) return '—';
	return new Intl.NumberFormat(localeTag[locale], {
		style: 'currency',
		currency: 'CAD',
	}).format(n);
}
