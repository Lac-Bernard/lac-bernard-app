/**
 * Deletes ALL rows from `payments` then `memberships` (dev / local testing only).
 *
 * Requires ALLOW_CLEAR_MEMBERSHIPS=1 and SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * (loads `.env` from the repo root when present).
 *
 * Usage:
 *   ALLOW_CLEAR_MEMBERSHIPS=1 node scripts/clear-memberships-dev.mjs
 *
 * Or: npm run db:clear-memberships-dev
 */
import { createClient } from '@supabase/supabase-js';
import { loadDotEnvFromRepoRoot } from './load-dotenv.mjs';

loadDotEnvFromRepoRoot();

if (process.env.ALLOW_CLEAR_MEMBERSHIPS !== '1') {
	console.error(
		'Refusing to run: set ALLOW_CLEAR_MEMBERSHIPS=1 (this wipes all payments and memberships).',
	);
	process.exit(1);
}

const url = process.env.SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
	console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
	process.exit(1);
}

const supabase = createClient(url, serviceKey, {
	auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
	const { count: payBefore } = await supabase
		.from('payments')
		.select('*', { count: 'exact', head: true });
	const { count: memBefore } = await supabase
		.from('memberships')
		.select('*', { count: 'exact', head: true });

	console.log(`Before — payments: ${payBefore ?? 0}, memberships: ${memBefore ?? 0}`);

	const { error: e1 } = await supabase.from('payments').delete().not('id', 'is', null);
	if (e1) {
		console.error('Delete payments:', e1.message);
		process.exit(1);
	}

	const { error: e2 } = await supabase.from('memberships').delete().not('id', 'is', null);
	if (e2) {
		console.error('Delete memberships:', e2.message);
		process.exit(1);
	}

	const { count: payAfter } = await supabase
		.from('payments')
		.select('*', { count: 'exact', head: true });
	const { count: memAfter } = await supabase
		.from('memberships')
		.select('*', { count: 'exact', head: true });

	console.log(`After — payments: ${payAfter ?? 0}, memberships: ${memAfter ?? 0} (expected 0 / 0).`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
