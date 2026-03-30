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

/** Plain text for admin labels and ARIA: `Primary & Other` when co-listed names exist. */
export function formatMemberJoinedNames(m: MemberNameFields): string {
	const parts = memberSummaryNameParts(m);
	if (!parts) return formatMemberPrimaryName(m);
	return `${parts.primary} & ${parts.other}`;
}

/**
 * Admin UI: inner HTML (already escaped) for primary, or primary + muted joiner + other.
 * Pass your HTML escaper (e.g. from the client bundle) as the second argument.
 */
export function formatAdminMemberNameHtml(m: MemberNameFields, escapeHtml: (s: string) => string): string {
	const parts = memberSummaryNameParts(m);
	const primaryHtml = escapeHtml(parts ? parts.primary : formatMemberPrimaryName(m));
	if (!parts) return primaryHtml;
	const otherHtml = escapeHtml(parts.other);
	return `<span class="adminMemberNamePrimary">${primaryHtml}</span><span class="adminMemberNameJoiner"> & </span><span class="adminMemberNameOther">${otherHtml}</span>`;
}

export function formatAdminMemberNameTd(m: MemberNameFields, escapeHtml: (s: string) => string): string {
	return `<td class="adminMemberNameCell">${formatAdminMemberNameHtml(m, escapeHtml)}</td>`;
}
