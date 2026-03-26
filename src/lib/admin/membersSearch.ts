/** Strip LIKE metacharacters from admin member search (RPC uses ILIKE). */
export function sanitizeAdminMemberSearch(q: string): string {
	return q.replace(/[%_\\]/g, '').trim();
}
