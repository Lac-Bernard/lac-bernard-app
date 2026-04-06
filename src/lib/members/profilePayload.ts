/** Editable member profile fields (API ↔ DB). */
export type MemberProfilePayload = {
	first_name: string;
	secondary_first_name: string | null;
	last_name: string;
	secondary_last_name: string | null;
	secondary_email: string | null;
	primary_phone: string | null;
	secondary_phone: string | null;
	lake_civic_number: string | null;
	lake_street_name: string | null;
	email_opt_in: boolean;
	/** How lake civic/street were captured: Google Places vs manual (null = legacy / unspecified). */
	lake_address_source: 'places' | 'manual' | null;
	lake_google_place_id: string | null;
	lake_formatted_address: string | null;
};

export function trimOrNull(v: unknown): string | null {
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

export function normalizeEmail(v: unknown): string | null {
	const t = trimOrNull(v);
	if (!t) return null;
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return null;
	return t.toLowerCase();
}

export function normalizePhone(v: unknown): string | null {
	const t = trimOrNull(v);
	if (!t) return null;
	const hasLeadingPlus = t.startsWith('+');
	const digits = t.replace(/[^\d]/g, '');
	if (digits.length < 10 || digits.length > 15) return null;
	return hasLeadingPlus ? `+${digits}` : digits;
}

function normalizeLakeSource(v: unknown): 'places' | 'manual' | null {
	const t = trimOrNull(v);
	if (!t) return null;
	if (t === 'places' || t === 'manual') return t;
	return null;
}

export function normalizePostalCode(v: unknown): string | null {
	const t = trimOrNull(v);
	if (!t) return null;
	const compact = t.replace(/[\s-]+/g, '').toUpperCase();
	if (/^\d{5}$/.test(compact)) return compact;
	if (/^\d{9}$/.test(compact)) return `${compact.slice(0, 5)}-${compact.slice(5)}`;
	if (/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(compact)) return `${compact.slice(0, 3)} ${compact.slice(3)}`;
	return t;
}

export function parseMemberProfilePayload(body: unknown): { ok: true; value: MemberProfilePayload } | { ok: false; error: string } {
	if (body === null || typeof body !== 'object') {
		return { ok: false, error: 'invalid_json' };
	}
	const o = body as Record<string, unknown>;
	const first = typeof o.first_name === 'string' ? o.first_name.trim() : '';
	if (!first) {
		return { ok: false, error: 'first_name_required' };
	}
	const last = typeof o.last_name === 'string' ? o.last_name.trim() : '';
	if (!last) {
		return { ok: false, error: 'last_name_required' };
	}
	if (Object.prototype.hasOwnProperty.call(o, 'secondary_email')) {
		const secondary = normalizeEmail(o.secondary_email);
		if (o.secondary_email !== null && o.secondary_email !== '' && !secondary) {
			return { ok: false, error: 'invalid_secondary_email' };
		}
	}
	const rawPrimaryPhone = trimOrNull(o.primary_phone);
	const primaryPhone = normalizePhone(o.primary_phone);
	if (rawPrimaryPhone && !primaryPhone) {
		return { ok: false, error: 'invalid_primary_phone' };
	}
	const rawSecondaryPhone = trimOrNull(o.secondary_phone);
	const secondaryPhone = normalizePhone(o.secondary_phone);
	if (rawSecondaryPhone && !secondaryPhone) {
		return { ok: false, error: 'invalid_secondary_phone' };
	}
	const lakeCivicNumber = trimOrNull(o.lake_civic_number);
	const lakeStreetName = trimOrNull(o.lake_street_name);
	if (Boolean(lakeCivicNumber) !== Boolean(lakeStreetName)) {
		return { ok: false, error: 'invalid_lake_address' };
	}
	if (Object.prototype.hasOwnProperty.call(o, 'lake_address_source')) {
		const src = normalizeLakeSource(o.lake_address_source);
		if (o.lake_address_source !== null && o.lake_address_source !== '' && src === null) {
			return { ok: false, error: 'invalid_lake_source' };
		}
	}

	let lakeSource = Object.prototype.hasOwnProperty.call(o, 'lake_address_source')
		? normalizeLakeSource(o.lake_address_source)
		: null;
	let lakePlaceId = trimOrNull(o.lake_google_place_id);
	let lakeFormatted = trimOrNull(o.lake_formatted_address);

	if (!lakeCivicNumber && !lakeStreetName) {
		lakeSource = null;
		lakePlaceId = null;
		lakeFormatted = null;
	} else if (lakeSource === 'manual') {
		lakePlaceId = null;
	}
	if (!lakeFormatted && lakeCivicNumber && lakeStreetName) {
		lakeFormatted = `${lakeCivicNumber} ${lakeStreetName}`.trim();
	}
	return {
		ok: true,
		value: {
			first_name: first,
			secondary_first_name: trimOrNull(o.secondary_first_name),
			last_name: last,
			secondary_last_name: trimOrNull(o.secondary_last_name),
			secondary_email: normalizeEmail(o.secondary_email),
			primary_phone: primaryPhone,
			secondary_phone: secondaryPhone,
			lake_civic_number: lakeCivicNumber,
			lake_street_name: lakeStreetName,
			email_opt_in: bool(o.email_opt_in, false),
			lake_address_source: lakeSource,
			lake_google_place_id: lakePlaceId,
			lake_formatted_address: lakeFormatted,
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
		secondary_first_name: p.secondary_first_name,
		last_name: p.last_name,
		secondary_last_name: p.secondary_last_name,
		secondary_email: p.secondary_email,
		primary_phone: p.primary_phone,
		secondary_phone: p.secondary_phone,
		lake_civic_number: p.lake_civic_number,
		lake_street_name: p.lake_street_name,
		email_opt_in: p.email_opt_in,
		lake_address_source: p.lake_address_source,
		lake_google_place_id: p.lake_google_place_id,
		lake_formatted_address: p.lake_formatted_address,
	};
}

export function payloadToUpdate(
	p: MemberProfilePayload,
	primary_email: string,
): Record<string, unknown> {
	return {
		primary_email,
		first_name: p.first_name,
		secondary_first_name: p.secondary_first_name,
		last_name: p.last_name,
		secondary_last_name: p.secondary_last_name,
		secondary_email: p.secondary_email,
		primary_phone: p.primary_phone,
		secondary_phone: p.secondary_phone,
		lake_civic_number: p.lake_civic_number,
		lake_street_name: p.lake_street_name,
		email_opt_in: p.email_opt_in,
		lake_address_source: p.lake_address_source,
		lake_google_place_id: p.lake_google_place_id,
		lake_formatted_address: p.lake_formatted_address,
	};
}
