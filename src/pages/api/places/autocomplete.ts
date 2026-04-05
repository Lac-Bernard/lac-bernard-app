export const prerender = false;
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getGoogleMapsApiKey, getPlacesAutocompleteBody } from '../../../lib/places/placesEnv';

type AutocompleteSuggestion = { placeId: string; text: string };

export const POST: APIRoute = async ({ request, cookies }) => {
	const supabase = createSupabaseServerClient(request, cookies);
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr || !user) {
		return new Response(JSON.stringify({ error: 'unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const apiKey = getGoogleMapsApiKey();
	if (!apiKey) {
		return new Response(JSON.stringify({ error: 'places_unconfigured' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'invalid_json' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	if (body === null || typeof body !== 'object') {
		return new Response(JSON.stringify({ error: 'invalid_json' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const o = body as Record<string, unknown>;
	const input = typeof o.input === 'string' ? o.input : '';
	const sessionToken = typeof o.sessionToken === 'string' ? o.sessionToken : '';
	const locale = o.locale === 'fr' ? 'fr' : 'en';

	if (!sessionToken.trim()) {
		return new Response(JSON.stringify({ error: 'session_token_required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	if (input.trim().length < 2) {
		return new Response(JSON.stringify({ suggestions: [] as AutocompleteSuggestion[] }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const payload = getPlacesAutocompleteBody(input, sessionToken, locale);

	const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Goog-Api-Key': apiKey,
			'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
		},
		body: JSON.stringify(payload),
	});

	if (!res.ok) {
		const errText = await res.text().catch(() => '');
		return new Response(JSON.stringify({ error: 'places_upstream', detail: errText.slice(0, 200) }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let data: unknown;
	try {
		data = await res.json();
	} catch {
		return new Response(JSON.stringify({ error: 'places_bad_json' }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const suggestions: AutocompleteSuggestion[] = [];
	const root = data as { suggestions?: unknown[] };
	for (const s of root.suggestions ?? []) {
		if (s === null || typeof s !== 'object') continue;
		const p = (s as { placePrediction?: { placeId?: string; text?: { text?: string } } }).placePrediction;
		const placeId = typeof p?.placeId === 'string' ? p.placeId.trim() : '';
		const text = typeof p?.text?.text === 'string' ? p.text.text.trim() : '';
		if (placeId && text) {
			suggestions.push({ placeId, text });
		}
	}

	return new Response(JSON.stringify({ suggestions }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
