import type { AdminMemberEmailScope, AdminMemberIndexView } from './memberIndexParams';
import { formatMemberPrimaryName, formatSecondaryPersonName } from '../members/memberDisplayName';

export type MemberIndexEmailRow = {
	first_name: string | null;
	last_name: string;
	secondary_first_name?: string | null;
	secondary_last_name?: string | null;
	primary_email: string | null;
	secondary_email: string | null;
	email_opt_in: boolean;
};

function quoteDisplayNameForAddress(name: string): string {
	const n = name.replace(/\s+/g, ' ').trim();
	if (!n) return '';
	return /[",<>@]/.test(n) ? `"${n.replace(/(["\\])/g, '\\$1')}"` : n;
}

/** `Display Name <email@>` or bare email if no display name. */
export function formatNamedMailbox(displayName: string, email: string): string {
	const e = email.trim();
	if (!e) return '';
	const q = quoteDisplayNameForAddress(displayName);
	return q ? `${q} <${e}>` : e;
}

/** Whether this view uses opt-in as the default for the copy-email action. */
export function memberIndexViewDefaultsToEmailOptIn(view: AdminMemberIndexView): boolean {
	return view === 'mailing' || view === 'lapsed';
}

export function resolveEmailScopeForExport(
	view: AdminMemberIndexView,
	raw: string | null | undefined,
): AdminMemberEmailScope {
	const v = (raw ?? '').trim().toLowerCase();
	if (v === 'opt_in') return 'opt_in';
	if (v === 'all') return 'all';
	return memberIndexViewDefaultsToEmailOptIn(view) ? 'opt_in' : 'all';
}

/** One line per mailbox; primary then secondary when present. De-dupes by lowercased email. */
export function buildMemberIndexEmailLines(
	rows: MemberIndexEmailRow[],
	scope: AdminMemberEmailScope,
): string[] {
	const seen = new Set<string>();
	const mailboxes: string[] = [];

	for (const member of rows) {
		if (scope === 'opt_in' && !member.email_opt_in) continue;

		const primaryEmail = (member.primary_email ?? '').trim();
		if (primaryEmail) {
			const primaryKey = primaryEmail.toLowerCase();
			if (!seen.has(primaryKey)) {
				seen.add(primaryKey);
				const primaryName = formatMemberPrimaryName(member);
				const mailbox = formatNamedMailbox(primaryName, primaryEmail);
				if (mailbox) mailboxes.push(mailbox);
			}
		}

		const secondaryEmail = (member.secondary_email ?? '').trim();
		if (!secondaryEmail) continue;

		const secondaryKey = secondaryEmail.toLowerCase();
		if (seen.has(secondaryKey)) continue;
		seen.add(secondaryKey);
		const secondaryName = formatSecondaryPersonName(member);
		const secondaryMailbox = formatNamedMailbox(secondaryName, secondaryEmail);
		if (secondaryMailbox) mailboxes.push(secondaryMailbox);
	}

	return mailboxes;
}
