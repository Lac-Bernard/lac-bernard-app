import type { APIRoute } from 'astro';
import { parseAdminMemberListFilters } from '../../../lib/admin/memberListFilters';
import { requireAdminSession } from '../../../lib/admin/session';
import { formatMemberJoinedNames } from '../../../lib/members/memberDisplayName';
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
};

type MembersPagePayload = {
	members?: ExportMemberRow[];
	total?: number;
	error?: string;
};

function formatAddressDisplayName(member: ExportMemberRow): string {
	const name = formatMemberJoinedNames(member).replace(/\s+/g, ' ').trim();
	if (!name) return '';
	return /[",<>@]/.test(name) ? `"${name.replace(/(["\\])/g, '\\$1')}"` : name;
}

function formatMailbox(member: ExportMemberRow): string {
	const email = (member.primary_email ?? '').trim();
	if (!email) return '';
	const name = formatAddressDisplayName(member);
	return name ? `${name} <${email}>` : email;
}

/** Mail-client-friendly address list for the current members filters. Success: { emails: string } */
export const GET: APIRoute = async ({ request, cookies, url }) => {
	try {
		const auth = await requireAdminSession(request, cookies);
		if (!auth.ok) return auth.response;

		const { year, membership, tier, memberStatus, q } = parseAdminMemberListFilters(url.searchParams);
		const service = createSupabaseServiceRoleClient();
		const seen = new Set<string>();
		const mailboxes: string[] = [];
		const pageSize = 500;
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
				const email = (member.primary_email ?? '').trim();
				const emailKey = email.toLowerCase();
				if (!email || seen.has(emailKey)) continue;
				seen.add(emailKey);
				const mailbox = formatMailbox(member);
				if (mailbox) mailboxes.push(mailbox);
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
