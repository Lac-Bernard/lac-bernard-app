/** CAD amounts in cents for Stripe Checkout line items. */
export const MEMBERSHIP_TIER_CENTS = {
	general: 7500,
	associate: 2500,
} as const;

/** Maximum optional donation (dollars) per checkout. */
export const MAX_DONATION_DOLLARS = 50_000;

export function membershipCentsForTier(tier: string): number | null {
	if (tier === 'general') return MEMBERSHIP_TIER_CENTS.general;
	if (tier === 'associate') return MEMBERSHIP_TIER_CENTS.associate;
	return null;
}

/** Parse donation dollars; returns null if invalid. */
export function parseDonationDollars(raw: unknown): number | null {
	if (raw === undefined || raw === null || raw === '') return 0;
	const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
	if (!Number.isFinite(n) || n < 0) return null;
	if (n > MAX_DONATION_DOLLARS) return null;
	return Math.round(n * 100) / 100;
}

/** Stripe metadata values are limited to 500 characters. */
export const MAX_DONATION_NOTE_LENGTH = 500;

/** Trimmed donation note; null if invalid (e.g. too long or wrong type). Empty string if absent. */
export function parseDonationNote(raw: unknown): string | null {
	if (raw === undefined || raw === null || raw === '') return '';
	if (typeof raw !== 'string') return null;
	const t = raw.trim();
	if (t.length > MAX_DONATION_NOTE_LENGTH) return null;
	return t;
}
