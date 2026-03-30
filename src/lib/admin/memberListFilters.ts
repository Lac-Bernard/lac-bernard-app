import { sanitizeAdminMemberSearch } from './membersSearch';
import { getMembershipCalendarYear } from '../members/membershipYear';

/** Same interpretation as GET /api/admin/members — single source of truth for list + export. */
export type AdminMemberListFilters = {
	year: number;
	membership: 'active' | 'not_active' | 'all' | 'has_membership_history';
	tier: 'all' | 'general' | 'associate';
	/** Directory lifecycle filter (members.status); default verified. */
	memberStatus: 'verified' | 'new' | 'disabled' | 'all';
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
	let membership: AdminMemberListFilters['membership'] = 'active';
	if (membershipRaw === 'not_active') membership = 'not_active';
	else if (membershipRaw === 'all') membership = 'all';
	else if (membershipRaw === 'has_membership_history') membership = 'has_membership_history';

	const tierRaw = (searchParams.get('tier') ?? 'all').trim().toLowerCase();
	const tier: 'all' | 'general' | 'associate' =
		tierRaw === 'general' || tierRaw === 'associate' ? tierRaw : 'all';

	const msRaw = (searchParams.get('memberStatus') ?? 'verified').trim().toLowerCase();
	let memberStatus: AdminMemberListFilters['memberStatus'] = 'verified';
	if (msRaw === 'new') memberStatus = 'new';
	else if (msRaw === 'disabled') memberStatus = 'disabled';
	else if (msRaw === 'all') memberStatus = 'all';

	return { year, membership, tier, memberStatus, q };
}
