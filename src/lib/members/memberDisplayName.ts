/** Display helpers for member names (primary vs secondary on the same membership row). */

export type MemberNameFields = {
	first_name: string | null;
	last_name: string;
	secondary_first_name?: string | null;
	secondary_last_name?: string | null;
};

/** Dense lists: lead person only (first + last). */
export function formatMemberPrimaryName(m: MemberNameFields): string {
	const f = (m.first_name ?? '').trim();
	const l = (m.last_name ?? '').trim();
	return `${f} ${l}`.trim();
}

/** Profile / detail: full co-listing when secondary_* are set (plain text, slash separator). */
export function formatMemberWithSecondaryNames(m: MemberNameFields): string {
	const primary = formatMemberPrimaryName(m);
	const secondaryFirst = (m.secondary_first_name ?? '').trim();
	const secondaryLast = (m.secondary_last_name ?? '').trim();
	if (!secondaryFirst && !secondaryLast) return primary;
	const secondary = [secondaryFirst, secondaryLast].filter(Boolean).join(' ').trim();
	if (!secondary) return primary;
	return `${primary} / ${secondary}`;
}

/** Secondary line only (first + last), for exports and CSV. */
export function formatSecondaryPersonName(m: MemberNameFields): string {
	const secondaryFirst = (m.secondary_first_name ?? '').trim();
	const secondaryLast = (m.secondary_last_name ?? '').trim();
	return [secondaryFirst, secondaryLast].filter(Boolean).join(' ').trim();
}

/** When co-listed names exist, split for UI: `primary` & `secondary`. */
export function memberSummaryNameParts(m: MemberNameFields): { primary: string; secondary: string } | null {
	const primary = formatMemberPrimaryName(m);
	const secondary = formatSecondaryPersonName(m);
	if (!secondary) return null;
	return { primary, secondary };
}

/** Plain text for admin labels and ARIA: `Primary & Secondary` when co-listed names exist. */
export function formatMemberJoinedNames(m: MemberNameFields): string {
	const parts = memberSummaryNameParts(m);
	if (!parts) return formatMemberPrimaryName(m);
	return `${parts.primary} & ${parts.secondary}`;
}

/**
 * Admin UI: inner HTML (already escaped) for primary, or primary + muted joiner + other.
 * Pass your HTML escaper (e.g. from the client bundle) as the second argument.
 */
export function formatAdminMemberNameHtml(m: MemberNameFields, escapeHtml: (s: string) => string): string {
	const parts = memberSummaryNameParts(m);
	const primaryHtml = escapeHtml(parts ? parts.primary : formatMemberPrimaryName(m));
	if (!parts) return primaryHtml;
	const secondaryHtml = escapeHtml(parts.secondary);
	return `<span class="adminMemberNamePrimary">${primaryHtml}</span><span class="adminMemberNameJoiner"> & </span><span class="adminMemberNameSecondary">${secondaryHtml}</span>`;
}

export function formatAdminMemberNameTd(m: MemberNameFields, escapeHtml: (s: string) => string): string {
	return `<td class="adminMemberNameCell">${formatAdminMemberNameHtml(m, escapeHtml)}</td>`;
}
