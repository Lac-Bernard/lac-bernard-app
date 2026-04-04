import type { MemberLocale } from '../members/i18n';
import { memberCopy } from '../members/i18n';
import { formatMemberPrimaryName, formatSecondaryPersonName } from '../members/memberDisplayName';

export type CsvMemberRow = {
	first_name: string | null;
	last_name: string;
	secondary_first_name?: string | null;
	secondary_last_name?: string | null;
	primary_email: string | null;
	secondary_email?: string | null;
	lake_civic_number?: string | null;
	lake_street_name?: string | null;
	membership_tier_for_year?: string | null;
};

/** RFC 4180-style field escaping for CSV. */
export function csvEscapeCell(value: string | number | null | undefined): string {
	const s = value == null ? '' : String(value);
	if (/[",\r\n]/.test(s)) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
}

export function formatLakeAddressLine(civic: string | null | undefined, street: string | null | undefined): string {
	const c = (civic ?? '').trim();
	const st = (street ?? '').trim();
	if (!c && !st) return '';
	return [c, st].filter(Boolean).join(' ').trim();
}

function tierLabelForCsv(raw: string | null | undefined, locale: MemberLocale): string {
	if (raw === 'general') return memberCopy[locale].tierGeneral;
	if (raw === 'associate') return memberCopy[locale].tierAssociate;
	return (raw ?? '').trim();
}

export function buildMembersCsv(
	rows: CsvMemberRow[],
	year: number,
	locale: MemberLocale,
): string {
	const t = memberCopy[locale];
	const header = [
		t.adminCsvColMemberName,
		t.adminCsvColMemberEmail,
		t.adminCsvColSecondaryName,
		t.adminCsvColSecondaryEmail,
		t.adminCsvColLakeAddress,
		t.adminCsvColMembershipType,
		t.adminCsvColMembershipYear,
	].map((h) => csvEscapeCell(h));

	const lines = [header.join(',')];
	const yearStr = String(year);

	for (const m of rows) {
		const line = [
			csvEscapeCell(formatMemberPrimaryName(m)),
			csvEscapeCell((m.primary_email ?? '').trim()),
			csvEscapeCell(formatSecondaryPersonName(m)),
			csvEscapeCell((m.secondary_email ?? '').trim()),
			csvEscapeCell(formatLakeAddressLine(m.lake_civic_number, m.lake_street_name)),
			csvEscapeCell(tierLabelForCsv(m.membership_tier_for_year, locale)),
			csvEscapeCell(yearStr),
		].join(',');
		lines.push(line);
	}

	return `\uFEFF${lines.join('\r\n')}\r\n`;
}
