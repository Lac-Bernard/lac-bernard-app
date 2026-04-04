import type { APIRoute } from 'astro';
import { buildMembersCsv, type CsvMemberRow } from '../../../lib/admin/membersCsvExport';
import { parseAdminMemberListFilters } from '../../../lib/admin/memberListFilters';
import { requireAdminSession } from '../../../lib/admin/session';
import type { MemberLocale } from '../../../lib/members/i18n';
import { createSupabaseServiceRoleClient } from '../../../lib/supabase/service';

type MembersPagePayload = {
	members?: CsvMemberRow[];
	total?: number;
	error?: string;
};

function parseLocale(raw: string | null): MemberLocale {
	return raw === 'fr' ? 'fr' : 'en';
}

export const GET: APIRoute = async ({ request, cookies, url }) => {
	const auth = await requireAdminSession(request, cookies);
	if (!auth.ok) return auth.response;

	const { year, membership, tier, memberStatus, q } = parseAdminMemberListFilters(url.searchParams);
	const locale = parseLocale(url.searchParams.get('locale'));

	const service = createSupabaseServiceRoleClient();
	const rows: CsvMemberRow[] = [];
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
			return new Response(JSON.stringify({ error: 'export_failed', detail: error.message }), {
				status: 500,
				headers: { 'Content-Type': 'application/json; charset=utf-8' },
			});
		}

		const payload = (data ?? null) as MembersPagePayload | null;
		if (payload?.error) {
			return new Response(JSON.stringify({ error: 'export_failed', detail: payload.error }), {
				status: 400,
				headers: { 'Content-Type': 'application/json; charset=utf-8' },
			});
		}

		const chunk = Array.isArray(payload?.members) ? (payload.members as CsvMemberRow[]) : [];
		rows.push(...chunk);

		if (chunk.length < pageSize) break;
		offset += chunk.length;
	}

	const csv = buildMembersCsv(rows, year, locale);
	const safeYear = String(year).replace(/[^\d]/g, '') || 'export';
	const filename = `lac-bernard-members-${safeYear}.csv`;

	return new Response(csv, {
		status: 200,
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Cache-Control': 'no-store',
		},
	});
};
