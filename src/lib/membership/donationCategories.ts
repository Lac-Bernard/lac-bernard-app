/** Allowed donation fund categories stored on payments.donation_category. */
export const DONATION_CATEGORIES = ['environment', 'regatta', 'general'] as const;

export type DonationCategory = (typeof DONATION_CATEGORIES)[number];

export const DEFAULT_DONATION_CATEGORY: DonationCategory = 'environment';

export function isDonationCategory(value: string): value is DonationCategory {
	return (DONATION_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Parse a donation category from request/UI input.
 * - When donationCents/dollars is 0: returns null (category not stored).
 * - When donation > 0: returns a valid category, defaulting to Environment if absent.
 * - Returns undefined if the value is present but invalid.
 */
export function parseDonationCategory(
	raw: unknown,
	opts: { donationAmount: number },
): DonationCategory | null | undefined {
	if (!(opts.donationAmount > 0)) return null;

	if (raw === undefined || raw === null || raw === '') {
		return DEFAULT_DONATION_CATEGORY;
	}
	if (typeof raw !== 'string') return undefined;
	const normalized = raw.trim().toLowerCase();
	if (!isDonationCategory(normalized)) return undefined;
	return normalized;
}
