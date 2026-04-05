export const prerender = false;
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { parsePlaceDetailsToLake } from '../../../lib/places/parsePlaceDetails';
import { getGoogleMapsApiKey } from '../../../lib/places/placesEnv';

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
	const placeId = typeof o.placeId === 'string' ? o.placeId.trim() : '';
	const sessionToken = typeof o.sessionToken === 'string' ? o.sessionToken.trim() : '';
	const locale = o.locale === 'fr' ? 'fr' : 'en';

	if (!placeId) {
		return new Response(JSON.stringify({ error: 'place_id_required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	if (!sessionToken) {
		return new Response(JSON.stringify({ error: 'session_token_required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const langParam = locale === 'fr' ? 'fr' : 'en';
	const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
	url.searchParams.set('languageCode', langParam);
	url.searchParams.set('sessionToken', sessionToken);

	const res = await fetch(url.toString(), {
		method: 'GET',
		headers: {
			'X-Goog-Api-Key': apiKey,
			'X-Goog-FieldMask': 'id,formattedAddress,addressComponents',
		},
	});

	if (!res.ok) {
		const errText = await res.text().catch(() => '');
		return new Response(JSON.stringify({ error: 'places_upstream', detail: errText.slice(0, 200) }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let json: unknown;
	try {
		json = await res.json();
	} catch {
		return new Response(JSON.stringify({ error: 'places_bad_json' }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const parsed = parsePlaceDetailsToLake(json);
	if (!parsed.ok) {
		return new Response(JSON.stringify({ error: parsed.error }), {
			status: 422,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(JSON.stringify({ ok: true, ...parsed.value }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
