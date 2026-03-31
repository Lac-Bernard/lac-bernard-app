import type { APIContext, APIRoute } from 'astro';
import { syncSupabaseToGoogleSheets } from '../../../lib/googleSheets/syncToSpreadsheet';
import { getCronSecret } from '../../../lib/supabase/env';

function isAuthorized(request: Request): boolean {
	try {
		const expected = `Bearer ${getCronSecret()}`;
		return request.headers.get('authorization') === expected;
	} catch {
		return false;
	}
}

async function handleSync({ request }: APIContext): Promise<Response> {
	if (!isAuthorized(request)) {
		return new Response(JSON.stringify({ error: 'unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const counts = await syncSupabaseToGoogleSheets();
		return new Response(JSON.stringify({ ok: true, counts }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('Google Sheets sync failed:', error);
		return new Response(JSON.stringify({ error: 'sync_failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

export const GET: APIRoute = handleSync;
export const POST: APIRoute = handleSync;
