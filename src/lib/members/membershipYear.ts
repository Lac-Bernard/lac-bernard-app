/** Calendar year for membership (association locale: Eastern Time). Matches RLS on `memberships.year`. */
export function getMembershipCalendarYear(date = new Date()): number {
	const y = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'America/Toronto',
		year: 'numeric',
	}).format(date);
	return Number(y);
}
