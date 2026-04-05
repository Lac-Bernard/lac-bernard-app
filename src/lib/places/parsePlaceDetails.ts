/** Parse Google Places API (New) Place Details JSON into lake DB fields. */

export type ParsedLakeFromPlace = {
	lake_civic_number: string | null;
	lake_street_name: string | null;
	lake_formatted_address: string | null;
	lake_google_place_id: string | null;
};

type AddressComponent = {
	longText?: string;
	shortText?: string;
	types?: string[];
};

function normalizePlaceResourceId(id: unknown): string | null {
	if (typeof id !== 'string' || !id.trim()) return null;
	const s = id.trim();
	if (s.startsWith('places/')) return s.slice('places/'.length);
	return s;
}

function pickComponent(components: AddressComponent[], type: string): string | null {
	for (const c of components) {
		if (c.types?.includes(type)) {
			const t = typeof c.longText === 'string' ? c.longText.trim() : '';
			return t === '' ? null : t;
		}
	}
	return null;
}

/**
 * Maps Places `addressComponents` to civic + street for Canadian-style civic addresses.
 * `route` holds the street name; `street_number` is the civic number.
 */
export function parsePlaceDetailsToLake(body: unknown): { ok: true; value: ParsedLakeFromPlace } | { ok: false; error: string } {
	if (body === null || typeof body !== 'object') {
		return { ok: false, error: 'invalid_response' };
	}
	const o = body as Record<string, unknown>;
	const id = normalizePlaceResourceId(o.id);
	const formatted =
		typeof o.formattedAddress === 'string' && o.formattedAddress.trim() !== ''
			? o.formattedAddress.trim()
			: null;

	const rawComponents = o.addressComponents;
	if (!Array.isArray(rawComponents)) {
		return { ok: false, error: 'missing_address_components' };
	}
	const components = rawComponents as AddressComponent[];

	const streetNumber = pickComponent(components, 'street_number');
	const subpremise = pickComponent(components, 'subpremise');
	const route = pickComponent(components, 'route');

	let civic: string | null = null;
	if (streetNumber) {
		civic = subpremise ? `${subpremise}-${streetNumber}` : streetNumber;
	} else if (subpremise) {
		civic = subpremise;
	}

	const street = route;

	if (!civic && !street) {
		return { ok: false, error: 'no_street_address' };
	}
	/* Profile + voting require both civic and street; rural edge cases need manual entry. */
	if (!civic || !street) {
		return { ok: false, error: 'incomplete_address' };
	}

	return {
		ok: true,
		value: {
			lake_civic_number: civic,
			lake_street_name: street,
			lake_formatted_address: formatted,
			lake_google_place_id: id,
		},
	};
}
