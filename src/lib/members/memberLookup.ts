import type { SupabaseClient } from '@supabase/supabase-js';

export type MemberProfile = {
	id: string;
	first_name: string | null;
	last_name: string;
	primary_email: string | null;
	secondary_email: string | null;
	user_id: string | null;
};

/** Escape `%` and `_` so `ILIKE` matches the literal email. */
function escapeIlikeExact(value: string): string {
	return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}

/** Resolve the `members` row: linked `user_id` first, else primary email only (secondary is not used for ownership). */
export async function findMemberByAuthEmail(
	supabase: SupabaseClient,
	authEmail: string,
): Promise<MemberProfile | null> {
	const raw = authEmail.trim();
	if (!raw) return null;

	const selectCols = 'id, first_name, last_name, primary_email, secondary_email, user_id';

	const { data: userData } = await supabase.auth.getUser();
	const uid = userData.user?.id;
	if (uid) {
		const { data: byUser, error: errUser } = await supabase
			.from('members')
			.select(selectCols)
			.eq('user_id', uid)
			.maybeSingle();
		if (errUser) return null;
		if (byUser) return byUser;
	}

	const pattern = escapeIlikeExact(raw);

	const { data: primaryMatch, error: errPrimary } = await supabase
		.from('members')
		.select(selectCols)
		.ilike('primary_email', pattern)
		.order('created_at', { ascending: true })
		.limit(1)
		.maybeSingle();

	if (errPrimary) return null;
	return primaryMatch ?? null;
}
