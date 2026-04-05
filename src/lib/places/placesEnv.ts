/** Server-only: bias for Lac Bernard area, Quebec (overridable via env). */

export function getPlacesAutocompleteBody(
	input: string,
	sessionToken: string,
	locale: 'en' | 'fr' = 'en',
): Record<string, unknown> {
	/* Default centre: Lac Bernard (~middle of the lake). Override via GOOGLE_PLACES_BIAS_LAT/LNG. */
	const lat = Number(import.meta.env.GOOGLE_PLACES_BIAS_LAT ?? '45.756872');
	const lng = Number(import.meta.env.GOOGLE_PLACES_BIAS_LNG ?? '-75.987225');
	const radius = Number(import.meta.env.GOOGLE_PLACES_BIAS_RADIUS_M ?? '5000');

	const circle: { center: { latitude: number; longitude: number }; radius: number } = {
		center: {
			latitude: Number.isFinite(lat) ? lat : 45.756872,
			longitude: Number.isFinite(lng) ? lng : -75.987225,
		},
		radius: Number.isFinite(radius) && radius > 0 ? radius : 5000,
	};

	return {
		input: input.trim(),
		sessionToken: sessionToken.trim(),
		includedRegionCodes: ['ca'],
		regionCode: 'ca',
		languageCode: locale === 'fr' ? 'fr' : 'en',
		locationBias: { circle },
	};
}

export function getGoogleMapsApiKey(): string | null {
	const k = import.meta.env.GOOGLE_MAPS_API_KEY;
	if (typeof k !== 'string' || k.trim() === '') return null;
	return k.trim();
}
