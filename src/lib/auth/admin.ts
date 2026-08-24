import type { SupabaseClient, User } from '@supabase/supabase-js';

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

/**
 * Looks up the signed-in user's own `members` row (via `members_select_own_by_email` RLS,
 * matching by `user_id` or `primary_email`) and reports whether it's `disabled`.
 */
export async function isDisabledMember(supabase: SupabaseClient, user: User): Promise<boolean> {
	const email = (user.email ?? '').trim();
	if (!user.id && !email) return false;

	const { data } = await supabase
		.from('members')
		.select('status')
		.or(`user_id.eq.${user.id},primary_email.ilike.${email}`)
		.maybeSingle();

	return data?.status === 'disabled';
}
