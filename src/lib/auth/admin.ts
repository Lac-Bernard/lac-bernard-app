import type { User } from '@supabase/supabase-js';

/**
 * Grant admin in Supabase (Dashboard → Authentication → user → raw app metadata), e.g.:
 * `{ "role": "admin" }` or `{ "admin": true }`
 */
export function isAppAdmin(user: User): boolean {
	const role = user.app_metadata?.role ?? user.user_metadata?.role;
	if (role === 'admin') return true;
	if (user.app_metadata?.admin === true) return true;
	if (user.user_metadata?.admin === true) return true;
	return false;
}
