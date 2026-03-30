/**
 * Format a Postgres `date` or timestamptz string for display in the admin UI.
 *
 * Plain `YYYY-MM-DD` strings must not use `new Date("YYYY-MM-DD")` — that parses as UTC
 * midnight and shows as the previous calendar day in Western timezones (e.g. Jan 1 → Dec 31).
 */
export function formatAdminLocaleDate(value: string | null | undefined): string {
	if (value == null || value === '') return '—';
	const s = value.trim();
	const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
	if (dateOnly) {
		const y = Number(dateOnly[1]);
		const mo = Number(dateOnly[2]) - 1;
		const d = Number(dateOnly[3]);
		if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return s;
		return new Date(y, mo, d).toLocaleDateString();
	}
	try {
		return new Date(s).toLocaleDateString();
	} catch {
		return s;
	}
}

/** Full timestamp for audit log and similar admin UI. */
export function formatAdminLocaleDateTime(value: string | null | undefined, locale = 'en-CA'): string {
	if (value == null || value === '') return '—';
	try {
		const d = new Date(value.trim());
		if (Number.isNaN(d.getTime())) return value;
		return d.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
	} catch {
		return String(value);
	}
}
