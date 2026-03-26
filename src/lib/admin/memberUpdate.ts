import type { MemberProfilePayload } from '../members/profilePayload';
import { parseMemberProfilePayload } from '../members/profilePayload';

function trimOrNullLocal(v: unknown): string | null {
	if (v === null || v === undefined) return null;
	if (typeof v !== 'string') return null;
	const t = v.trim();
	return t === '' ? null : t;
}

function parseEmail(v: unknown): string | null {
	const t = trimOrNullLocal(v);
	if (!t) return null;
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return null;
	return t.toLowerCase();
}

export type AdminMemberPatch = MemberProfilePayload & {
	notes?: string | null;
	secondary_email?: string | null;
	status?: string | null;
	user_id?: string | null;
	primary_email?: string | null;
};

export function parseAdminMemberPatch(body: unknown): { ok: true; value: AdminMemberPatch } | { ok: false; error: string } {
	if (body === null || typeof body !== 'object') {
		return { ok: false, error: 'invalid_json' };
	}
	const base = parseMemberProfilePayload(body);
	if (!base.ok) return base;
	const o = body as Record<string, unknown>;
	const has = (k: string) => Object.prototype.hasOwnProperty.call(o, k);

	if (has('secondary_email')) {
		const secondary = parseEmail(o.secondary_email);
		if (o.secondary_email !== null && o.secondary_email !== '' && !secondary) {
			return { ok: false, error: 'invalid_secondary_email' };
		}
	}

	if (has('primary_email')) {
		const primary = parseEmail(o.primary_email);
		if (o.primary_email !== null && o.primary_email !== '' && !primary) {
			return { ok: false, error: 'invalid_primary_email' };
		}
	}

	if (has('user_id')) {
		if (o.user_id === null || o.user_id === '') {
			// ok
		} else if (typeof o.user_id === 'string') {
			const u = o.user_id.trim();
			if (!/^[0-9a-f-]{36}$/i.test(u)) return { ok: false, error: 'invalid_user_id' };
		} else {
			return { ok: false, error: 'invalid_user_id' };
		}
	}

	if (has('notes') && o.notes !== null && typeof o.notes !== 'string') {
		return { ok: false, error: 'invalid_notes' };
	}

	if (has('status') && o.status !== null && typeof o.status !== 'string') {
		return { ok: false, error: 'invalid_status' };
	}

	const value: AdminMemberPatch = { ...base.value };

	if (has('secondary_email')) {
		const secondary = parseEmail(o.secondary_email);
		value.secondary_email = secondary;
	}
	if (has('primary_email')) {
		value.primary_email = parseEmail(o.primary_email);
	}
	if (has('user_id')) {
		if (o.user_id === null || o.user_id === '') value.user_id = null;
		else value.user_id = (o.user_id as string).trim();
	}
	if (has('notes')) {
		value.notes = o.notes === null ? null : (o.notes as string);
	}
	if (has('status')) {
		value.status = o.status === null ? null : (o.status as string).trim();
	}

	return { ok: true, value };
}

export function adminPatchToRow(p: AdminMemberPatch): Record<string, unknown> {
	const row: Record<string, unknown> = {
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
	if (Object.prototype.hasOwnProperty.call(p, 'notes')) row.notes = p.notes ?? null;
	if (Object.prototype.hasOwnProperty.call(p, 'secondary_email')) row.secondary_email = p.secondary_email ?? null;
	if (Object.prototype.hasOwnProperty.call(p, 'status')) {
		row.status = p.status != null && p.status.trim() !== '' ? p.status : null;
	}
	if (Object.prototype.hasOwnProperty.call(p, 'primary_email')) {
		row.primary_email = p.primary_email ?? null;
	}
	if (Object.prototype.hasOwnProperty.call(p, 'user_id')) row.user_id = p.user_id;
	return row;
}
