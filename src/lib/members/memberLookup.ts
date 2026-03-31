import type { SupabaseClient } from '@supabase/supabase-js';

export type MemberProfile = {
	id: string;
	first_name: string | null;
	/** Co-listed given name when the sheet listed two people in First Name. */
	secondary_first_name: string | null;
	last_name: string;
	/** From legacy Other LName; co-listed surname. */
	secondary_last_name: string | null;
	primary_email: string | null;
	secondary_email: string | null;
	user_id: string | null;
	primary_phone: string | null;
	secondary_phone: string | null;
	lake_phone: string | null;
	lake_civic_number: string | null;
	lake_street_name: string | null;
	primary_address: string | null;
	primary_city: string | null;
	primary_province: string | null;
	primary_country: string | null;
	primary_postal_code: string | null;
	email_opt_in: boolean;
};

/** Escape `%` and `_` so `ILIKE` matches the literal email. */
function escapeIlikeExact(value: string): string {
	return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}

function normalizeMember(row: {
	id: string;
	first_name: string | null;
	secondary_first_name: string | null;
	last_name: string;
	secondary_last_name: string | null;
	primary_email: string | null;
	secondary_email: string | null;
	user_id: string | null;
	primary_phone: string | null;
	secondary_phone: string | null;
	lake_phone: string | null;
	lake_civic_number: string | null;
	lake_street_name: string | null;
	primary_address: string | null;
	primary_city: string | null;
	primary_province: string | null;
	primary_country: string | null;
	primary_postal_code: string | null;
	email_opt_in: boolean | null;
}): MemberProfile {
	return {
		...row,
		secondary_first_name: row.secondary_first_name ?? null,
		secondary_last_name: row.secondary_last_name ?? null,
		email_opt_in: Boolean(row.email_opt_in),
	};
}

/** Resolve the `members` row: linked `user_id` first, else primary email only (secondary is not used for ownership). */
export async function findMemberByAuthEmail(
	supabase: SupabaseClient,
	authEmail: string,
): Promise<MemberProfile | null> {
	const raw = authEmail.trim();
	if (!raw) return null;

	const selectCols =
		'id, first_name, secondary_first_name, last_name, secondary_last_name, primary_email, secondary_email, user_id, ' +
		'primary_phone, secondary_phone, lake_phone, lake_civic_number, lake_street_name, ' +
		'primary_address, primary_city, primary_province, primary_country, primary_postal_code, email_opt_in';

	const { data: userData } = await supabase.auth.getUser();
	const uid = userData.user?.id;
	if (uid) {
		const { data: byUser, error: errUser } = await supabase
			.from('members')
			.select(selectCols)
			.eq('user_id', uid)
			.maybeSingle();
		if (errUser) return null;
		if (byUser) return normalizeMember(byUser);
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
	return primaryMatch ? normalizeMember(primaryMatch) : null;
}
