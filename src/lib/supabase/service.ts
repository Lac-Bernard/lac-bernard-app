import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleEnv } from './env';

/** Supabase client with service role (bypasses RLS). Use only after verifying `isAppAdmin` on the session. */
export function createSupabaseServiceRoleClient(): SupabaseClient {
	const { url, serviceRoleKey } = getSupabaseServiceRoleEnv();
	return createClient(url, serviceRoleKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
}
