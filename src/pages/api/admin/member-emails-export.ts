export const prerender = false;
import type { APIRoute } from 'astro';
import { parseAdminMemberListFilters } from '../../../lib/admin/memberListFilters';
import {
	buildMemberIndexEmailLines,
	resolveEmailScopeForExport,
	type MemberIndexEmailRow,
} from '../../../lib/admin/memberIndexEmailLines';
import { parseAdminMemberIndexParams } from '../../../lib/admin/memberIndexParams';
import { requireAdminSession } from '../../../lib/admin/session';
import { formatMemberPrimaryName, formatSecondaryPersonName } from '../../../lib/members/memberDisplayName';
import { createSupabaseServiceRoleClient } from '../../../lib/supabase/service';

const jsonHeaders = {
	'Content-Type': 'application/json; charset=utf-8',
	'Cache-Control': 'no-store',
} as const;

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

type ExportMemberRow = {
	first_name: string | null;
	last_name: string;
	secondary_first_name?: string | null;
	secondary_last_name?: string | null;
	primary_email: string | null;
	secondary_email?: string | null;
};

type MembersPagePayload = {
	members?: ExportMemberRow[];
	total?: number;
	error?: string;
};

function quoteDisplayNameForAddress(name: string): string {
	const n = name.replace(/\s+/g, ' ').trim();
	if (!n) return '';
	return /[",<>@]/.test(n) ? `"${n.replace(/(["\\])/g, '\\$1')}"` : n;
}

/** Legacy: `Display Name <email@>` or bare email if no display name. */
function formatNamedMailboxLegacy(displayName: string, email: string): string {
	const e = email.trim();
	if (!e) return '';
	const q = quoteDisplayNameForAddress(displayName);
	return q ? `${q} <${e}>` : e;
}

type IndexPayload = {
	members?: MemberIndexEmailRow[];
	error?: string;
};

/** Mail-client-friendly address list. Success: { lines, lineCount } for member index; legacy { emails } comma-separated. */
export const GET: APIRoute = async ({ request, cookies, url }) => {
	try {
		const auth = await requireAdminSession(request, cookies);
		if (!auth.ok) return auth.response;

		const service = createSupabaseServiceRoleClient();
		const pageSize = 500;

		if (url.searchParams.has('view')) {
			const ix = parseAdminMemberIndexParams(url.searchParams);
			const scope = resolveEmailScopeForExport(ix.view, url.searchParams.get('emailScope'));
			const allRows: MemberIndexEmailRow[] = [];
			let offset = 0;

			for (;;) {
				const { data, error } = await service.rpc('admin_member_index', {
					p_view: ix.view,
					p_year: ix.year,
					p_lapsed_since: ix.lapsedSince,
					p_include_disabled: ix.includeDisabled,
					p_q: ix.q || null,
					p_sort: ix.sort,
					p_limit: pageSize,
					p_offset: offset,
				});

				if (error) {
					return json({ error: 'export_failed', detail: error.message }, 500);
				}

				const payload = (data ?? null) as IndexPayload | null;
				if (payload?.error) {
					return json({ error: 'export_failed', detail: payload.error }, 400);
				}

				const members = Array.isArray(payload?.members) ? payload.members : [];
				for (const m of members) {
					allRows.push(m as MemberIndexEmailRow);
				}

				if (members.length < pageSize) break;
				offset += members.length;
			}

			const linesArr = buildMemberIndexEmailLines(allRows, scope);
			const lines = linesArr.join('\n');
			return json({
				lines,
				lineCount: linesArr.length,
				emailScope: scope,
			});
		}

		const { year, membership, tier, memberStatus, q } = parseAdminMemberListFilters(url.searchParams);
		const seen = new Set<string>();
		const mailboxes: string[] = [];
		let offset = 0;

		for (;;) {
			const { data, error } = await service.rpc('admin_members_page', {
				p_year: year,
				p_membership: membership,
				p_tier: tier,
				p_member_status: memberStatus,
				p_q: q || null,
				p_sort: 'last_name_asc',
				p_limit: pageSize,
				p_offset: offset,
			});

			if (error) {
				return json({ error: 'export_failed', detail: error.message }, 500);
			}

			const payload = (data ?? null) as MembersPagePayload | null;
			if (payload?.error) {
				return json({ error: 'export_failed', detail: payload.error }, 400);
			}

			const members = Array.isArray(payload?.members) ? payload.members : [];
			for (const member of members) {
				const primaryEmail = (member.primary_email ?? '').trim();
				if (!primaryEmail) continue;

				const primaryKey = primaryEmail.toLowerCase();
				if (!seen.has(primaryKey)) {
					seen.add(primaryKey);
					const primaryName = formatMemberPrimaryName(member);
					const mailbox = formatNamedMailboxLegacy(primaryName, primaryEmail);
					if (mailbox) mailboxes.push(mailbox);
				}

				const secondaryEmail = (member.secondary_email ?? '').trim();
				if (!secondaryEmail) continue;

				const secondaryKey = secondaryEmail.toLowerCase();
				if (seen.has(secondaryKey)) continue;
				seen.add(secondaryKey);
				const secondaryName = formatSecondaryPersonName(member);
				const secondaryMailbox = formatNamedMailboxLegacy(secondaryName, secondaryEmail);
				if (secondaryMailbox) mailboxes.push(secondaryMailbox);
			}

			if (members.length < pageSize) break;
			offset += members.length;
		}

		const emails = mailboxes.join(', ');
		return json({ emails });
	} catch (e) {
		const detail = e instanceof Error ? e.message : 'unknown_error';
		return json({ error: 'export_failed', detail }, 500);
	}
};
