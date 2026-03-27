export function getSupabaseServerEnv(): { url: string; anonKey: string } {
	const url = import.meta.env.PUBLIC_SUPABASE_URL ?? import.meta.env.SUPABASE_URL;
	const anonKey =
		import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? import.meta.env.SUPABASE_ANON_KEY;
	if (!url || !anonKey) {
		throw new Error(
			'Set SUPABASE_URL and SUPABASE_ANON_KEY in .env (optional PUBLIC_* duplicates for client-side use).',
		);
	}
	return { url, anonKey };
}

/** Server-only: used for admin API routes after session is verified. Never expose to the client. */
export function getSupabaseServiceRoleEnv(): { url: string; serviceRoleKey: string } {
	const { url } = getSupabaseServerEnv();
	const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!serviceRoleKey) {
		throw new Error('Set SUPABASE_SERVICE_ROLE_KEY in server environment for admin API routes.');
	}
	return { url, serviceRoleKey };
}

/** Server-only. `sk_test_…` (dev) or `sk_live_…` (prod). */
export function getStripeSecretKey(): string {
	const key = import.meta.env.STRIPE_SECRET_KEY;
	if (typeof key !== 'string' || !key.trim()) {
		throw new Error('Set STRIPE_SECRET_KEY in server environment for Stripe Checkout.');
	}
	return key.trim();
}

/** Server-only. `whsec_…` from Stripe Dashboard (prod) or `stripe listen` (local dev). */
export function getStripeWebhookSecret(): string {
	const key = import.meta.env.STRIPE_WEBHOOK_SECRET;
	if (typeof key !== 'string' || !key.trim()) {
		throw new Error('Set STRIPE_WEBHOOK_SECRET in server environment for Stripe webhooks.');
	}
	return key.trim();
}
