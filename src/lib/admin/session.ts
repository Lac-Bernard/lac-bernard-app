import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../supabase/server';
import { isAppAdmin } from '../auth/admin';

export type AdminSessionResult =
	| { ok: true; user: User }
	| { ok: false; response: Response };

/**
 * Resolve the signed-in user and require app admin (JWT app_metadata / metadata per isAppAdmin).
 */
export async function requireAdminSession(
	request: Request,
	cookies: Parameters<typeof createSupabaseServerClient>[1],
): Promise<AdminSessionResult> {
	const supabase = createSupabaseServerClient(request, cookies);
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error || !user) {
		return {
			ok: false,
			response: new Response(JSON.stringify({ error: 'unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			}),
		};
	}

	if (!isAppAdmin(user)) {
		return {
			ok: false,
			response: new Response(JSON.stringify({ error: 'forbidden' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			}),
		};
	}

	return { ok: true, user };
}
