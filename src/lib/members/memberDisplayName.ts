/** Display helpers for member names (primary vs co-listed on the same membership row). */

export type MemberNameFields = {
	first_name: string | null;
	last_name: string;
	other_first_name?: string | null;
	other_last_name?: string | null;
};

/** Dense lists: lead person only (first + last). */
export function formatMemberPrimaryName(m: MemberNameFields): string {
	const f = (m.first_name ?? '').trim();
	const l = (m.last_name ?? '').trim();
	return `${f} ${l}`.trim();
}

/** Profile / detail: full co-listing when other_* are set (plain text, slash separator). */
export function formatMemberWithOtherNames(m: MemberNameFields): string {
	const primary = formatMemberPrimaryName(m);
	const of = (m.other_first_name ?? '').trim();
	const ol = (m.other_last_name ?? '').trim();
	if (!of && !ol) return primary;
	const other = [of, ol].filter(Boolean).join(' ').trim();
	if (!other) return primary;
	return `${primary} / ${other}`;
}

/** When co-listed names exist, split for UI: `primary` & `other` (other = other first + other last). */
export function memberSummaryNameParts(m: MemberNameFields): { primary: string; other: string } | null {
	const primary = formatMemberPrimaryName(m);
	const of = (m.other_first_name ?? '').trim();
	const ol = (m.other_last_name ?? '').trim();
	const other = [of, ol].filter(Boolean).join(' ').trim();
	if (!other) return null;
	return { primary, other };
}
