import type { SupabaseClient } from '@supabase/supabase-js';

export type MemberProfile = {
	id: string;
	first_name: string | null;
	last_name: string;
	primary_email: string | null;
	secondary_email: string | null;
};

/** Escape `%` and `_` so `ILIKE` matches the literal email. */
function escapeIlikeExact(value: string): string {
	return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}

/** Resolve the `members` row for the signed-in user’s auth email (primary or secondary). */
export async function findMemberByAuthEmail(
	supabase: SupabaseClient,
	authEmail: string,
): Promise<MemberProfile | null> {
	const raw = authEmail.trim();
	if (!raw) return null;

	const pattern = escapeIlikeExact(raw);

	const { data: primaryMatch, error: errPrimary } = await supabase
		.from('members')
		.select('id, first_name, last_name, primary_email, secondary_email')
		.ilike('primary_email', pattern)
		.limit(1)
		.maybeSingle();

	if (errPrimary) return null;
	if (primaryMatch) return primaryMatch;

	const { data: secondaryMatch, error: errSecondary } = await supabase
		.from('members')
		.select('id, first_name, last_name, primary_email, secondary_email')
		.ilike('secondary_email', pattern)
		.limit(1)
		.maybeSingle();

	if (errSecondary) return null;
	return secondaryMatch ?? null;
}
