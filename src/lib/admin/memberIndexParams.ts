import { sanitizeAdminMemberSearch } from './membersSearch';
import { getMembershipCalendarYear } from '../members/membershipYear';

export type AdminMemberIndexView =
	| 'voting'
	| 'associate'
	| 'mailing'
	| 'pending'
	| 'lapsed'
	| 'incomplete'
	| 'all'
	| 'duplicate'
	| 'uncategorized_donors';

export type AdminMemberIndexSort = 'last_name_asc' | 'last_name_desc' | 'created_at_desc' | 'created_at_asc';

/** Email export: opt-in only vs all addresses (for views where opt-in is not the default rule). */
export type AdminMemberEmailScope = 'opt_in' | 'all';

export type AdminMemberIndexParams = {
	view: AdminMemberIndexView;
	year: number;
	lapsedSince: number;
	includeDisabled: boolean;
	q: string;
	sort: AdminMemberIndexSort;
};

function isView(s: string): s is AdminMemberIndexView {
	return (
		s === 'voting' ||
		s === 'associate' ||
		s === 'mailing' ||
		s === 'pending' ||
		s === 'lapsed' ||
		s === 'incomplete' ||
		s === 'all' ||
		s === 'duplicate' ||
		s === 'uncategorized_donors'
	);
}

function isSort(s: string): s is AdminMemberIndexSort {
	return s === 'last_name_asc' || s === 'last_name_desc' || s === 'created_at_desc' || s === 'created_at_asc';
}

export function parseAdminMemberIndexParams(searchParams: URLSearchParams): AdminMemberIndexParams {
	const rawView = (searchParams.get('view') ?? 'mailing').trim().toLowerCase();
	const view: AdminMemberIndexView = isView(rawView) ? rawView : 'mailing';

	const yearParsed = parseInt(searchParams.get('year') ?? '', 10);
	const year = Number.isFinite(yearParsed) ? yearParsed : getMembershipCalendarYear();

	const lapsedParsed = parseInt(searchParams.get('lapsedSince') ?? '', 10);
	const lapsedSince = Number.isFinite(lapsedParsed) ? lapsedParsed : year - 1;

	const includeDisabled = searchParams.get('includeDisabled') === '1' || searchParams.get('includeDisabled') === 'true';

	const q = sanitizeAdminMemberSearch((searchParams.get('q') ?? '').trim());

	const rawSort = (searchParams.get('sort') ?? 'last_name_asc').trim().toLowerCase();
	const sort: AdminMemberIndexSort = isSort(rawSort) ? rawSort : 'last_name_asc';

	return { view, year, lapsedSince, includeDisabled, q, sort };
}

export function parseEmailScope(raw: string | null | undefined): AdminMemberEmailScope {
	const v = (raw ?? '').trim().toLowerCase();
	return v === 'opt_in' ? 'opt_in' : 'all';
}
