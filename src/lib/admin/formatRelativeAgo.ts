/** Relative labels for admin timeline (America/Toronto for “yesterday”). */

export type AdminRelativeStrings = {
	justNow: string;
	minAgo: string;
	hrAgo: string;
	hrsAgo: string;
	yesterday: string;
	daysAgo: string;
	weeksAgo: string;
};

function torontoYmdParts(d: Date): { y: number; mo: number; day: number } {
	const fmt = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'America/Toronto',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	});
	const parts = fmt.formatToParts(d);
	const y = Number(parts.find((p) => p.type === 'year')?.value ?? 0);
	const mo = Number(parts.find((p) => p.type === 'month')?.value ?? 0);
	const day = Number(parts.find((p) => p.type === 'day')?.value ?? 0);
	return { y, mo, day };
}

function daysInMonth(y: number, mo: number): number {
	return new Date(y, mo, 0).getDate();
}

/** Previous calendar day in the same plain Y/M/D sense (Toronto wall-clock parts). */
function previousCalendarDay(y: number, mo: number, day: number): { y: number; mo: number; day: number } {
	let d = day - 1;
	let m = mo;
	let yr = y;
	if (d < 1) {
		m -= 1;
		if (m < 1) {
			m = 12;
			yr -= 1;
		}
		d = daysInMonth(yr, m);
	}
	return { y: yr, mo: m, day: d };
}

function applyTemplate(tpl: string, n: number): string {
	return tpl.replace(/\{\{n\}\}/g, String(n));
}

/**
 * Human-readable relative time for admin feed (EN/FR via strings).
 * “Yesterday” = previous calendar day in America/Toronto.
 */
export function formatAdminRelativeAgo(
	iso: string,
	strings: AdminRelativeStrings,
	nowInput: Date = new Date(),
): string {
	const occurred = new Date(iso.trim());
	if (Number.isNaN(occurred.getTime())) return '—';
	const now = nowInput;
	const diffMs = now.getTime() - occurred.getTime();
	if (diffMs < 0) return strings.justNow;

	if (diffMs < 45_000) return strings.justNow;

	const diffMin = Math.floor(diffMs / 60_000);
	if (diffMin < 60) {
		return applyTemplate(strings.minAgo, Math.max(1, diffMin));
	}

	// Prefer wall-clock hours for <24h even when that spans a Toronto midnight
	// (e.g. 11:55 PM → 1:05 AM should be “1 hr ago”, not “Yesterday”).
	const diffHr = Math.floor(diffMs / (60 * 60_000));
	if (diffHr < 24) {
		if (diffHr <= 1) return applyTemplate(strings.hrAgo, 1);
		return applyTemplate(strings.hrsAgo, diffHr);
	}

	const nowT = torontoYmdParts(now);
	const occT = torontoYmdParts(occurred);
	const yestT = previousCalendarDay(nowT.y, nowT.mo, nowT.day);
	const isYesterday =
		occT.y === yestT.y && occT.mo === yestT.mo && occT.day === yestT.day;
	if (isYesterday) {
		return strings.yesterday;
	}

	const diffDays = Math.floor(diffMs / (24 * 60 * 60_000));
	if (diffDays < 7) {
		return applyTemplate(strings.daysAgo, Math.max(1, diffDays));
	}

	const wk = Math.max(1, Math.floor(diffDays / 7));
	return applyTemplate(strings.weeksAgo, wk);
}
