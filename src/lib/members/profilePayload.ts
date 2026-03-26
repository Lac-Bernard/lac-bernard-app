/** Editable member profile fields (API ↔ DB). */
export type MemberProfilePayload = {
	first_name: string | null;
	last_name: string;
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

function trimOrNull(v: unknown): string | null {
	if (v === null || v === undefined) return null;
	if (typeof v !== 'string') return null;
	const t = v.trim();
	return t === '' ? null : t;
}

function bool(v: unknown, defaultFalse: boolean): boolean {
	if (typeof v === 'boolean') return v;
	if (v === 'true' || v === '1') return true;
	if (v === 'false' || v === '0') return false;
	return defaultFalse;
}

export function parseMemberProfilePayload(body: unknown): { ok: true; value: MemberProfilePayload } | { ok: false; error: string } {
	if (body === null || typeof body !== 'object') {
		return { ok: false, error: 'invalid_json' };
	}
	const o = body as Record<string, unknown>;
	const last = typeof o.last_name === 'string' ? o.last_name.trim() : '';
	if (!last) {
		return { ok: false, error: 'last_name_required' };
	}
	return {
		ok: true,
		value: {
			first_name: trimOrNull(o.first_name),
			last_name: last,
			primary_phone: trimOrNull(o.primary_phone),
			secondary_phone: trimOrNull(o.secondary_phone),
			lake_phone: trimOrNull(o.lake_phone),
			lake_civic_number: trimOrNull(o.lake_civic_number),
			lake_street_name: trimOrNull(o.lake_street_name),
			primary_address: trimOrNull(o.primary_address),
			primary_city: trimOrNull(o.primary_city),
			primary_province: trimOrNull(o.primary_province),
			primary_country: trimOrNull(o.primary_country),
			primary_postal_code: trimOrNull(o.primary_postal_code),
			email_opt_in: bool(o.email_opt_in, false),
		},
	};
}

export function payloadToRow(
	p: MemberProfilePayload,
	extra: { primary_email: string; user_id: string },
): Record<string, unknown> {
	return {
		user_id: extra.user_id,
		primary_email: extra.primary_email,
		first_name: p.first_name,
		last_name: p.last_name,
		primary_phone: p.primary_phone,
		secondary_phone: p.secondary_phone,
		lake_phone: p.lake_phone,
		lake_civic_number: p.lake_civic_number,
		lake_street_name: p.lake_street_name,
		primary_address: p.primary_address,
		primary_city: p.primary_city,
		primary_province: p.primary_province,
		primary_country: p.primary_country,
		primary_postal_code: p.primary_postal_code,
		email_opt_in: p.email_opt_in,
	};
}

export function payloadToUpdate(
	p: MemberProfilePayload,
	primary_email: string,
): Record<string, unknown> {
	return {
		primary_email,
		first_name: p.first_name,
		last_name: p.last_name,
		primary_phone: p.primary_phone,
		secondary_phone: p.secondary_phone,
		lake_phone: p.lake_phone,
		lake_civic_number: p.lake_civic_number,
		lake_street_name: p.lake_street_name,
		primary_address: p.primary_address,
		primary_city: p.primary_city,
		primary_province: p.primary_province,
		primary_country: p.primary_country,
		primary_postal_code: p.primary_postal_code,
		email_opt_in: p.email_opt_in,
	};
}
