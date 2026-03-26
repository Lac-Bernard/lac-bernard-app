import { sanitizeAdminMemberSearch } from './membersSearch';
import { getMembershipCalendarYear } from '../members/membershipYear';

/** Same interpretation as GET /api/admin/members — single source of truth for list + export. */
export type AdminMemberListFilters = {
	year: number;
	membership: 'active' | 'not_active';
	tier: 'all' | 'general' | 'associate';
	/** Pass to RPC as `p_q` via `q || null` */
	q: string;
};

export function parseAdminMemberListFilters(searchParams: URLSearchParams): AdminMemberListFilters {
	const rawQ = (searchParams.get('q') ?? '').trim();
	const q = sanitizeAdminMemberSearch(rawQ);

	const yearParam = searchParams.get('year');
	const yearParsed = yearParam ? parseInt(yearParam, 10) : NaN;
	const year = Number.isFinite(yearParsed) ? yearParsed : getMembershipCalendarYear();

	const membershipRaw = (searchParams.get('membership') ?? 'active').trim().toLowerCase();
	const membership: 'active' | 'not_active' = membershipRaw === 'not_active' ? 'not_active' : 'active';

	const tierRaw = (searchParams.get('tier') ?? 'all').trim().toLowerCase();
	const tier: 'all' | 'general' | 'associate' =
		tierRaw === 'general' || tierRaw === 'associate' ? tierRaw : 'all';

	return { year, membership, tier, q };
}
