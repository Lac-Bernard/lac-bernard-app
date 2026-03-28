/**
 * Sets `app_metadata.role` to `admin` for a user (local / dev bootstrap when Studio
 * does not expose raw app metadata). Uses the service role key — never run in production
 * with untrusted input.
 *
 * Requires ALLOW_GRANT_ADMIN_DEV=1 and SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * (loads `.env` from the repo root when present).
 *
 * Usage:
 *   ALLOW_GRANT_ADMIN_DEV=1 node scripts/grant-admin-dev.mjs you@example.com
 *   ALLOW_GRANT_ADMIN_DEV=1 node scripts/grant-admin-dev.mjs <auth-user-uuid>
 *
 * Or: npm run dev:grant-admin -- you@example.com
 *
 * After promoting, the user should sign out and sign in again (or refresh session) so the JWT picks up app_metadata.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadDotEnv() {
	const p = join(root, '.env');
	if (!existsSync(p)) return;
	const content = readFileSync(p, 'utf8');
	for (const line of content.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		const k = trimmed.slice(0, eq).trim();
		let v = trimmed.slice(eq + 1).trim();
		if (
			(v.startsWith('"') && v.endsWith('"')) ||
			(v.startsWith("'") && v.endsWith("'"))
		) {
			v = v.slice(1, -1);
		}
		if (process.env[k] === undefined) process.env[k] = v;
	}
}

loadDotEnv();

if (process.env.ALLOW_GRANT_ADMIN_DEV !== '1') {
	console.error(
		'Refusing to run: set ALLOW_GRANT_ADMIN_DEV=1 (this writes auth app_metadata via service role).',
	);
	process.exit(1);
}

const url = process.env.SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
	console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
	process.exit(1);
}

const rawArg = process.argv[2]?.trim();
if (!rawArg) {
	console.error('Usage: ALLOW_GRANT_ADMIN_DEV=1 node scripts/grant-admin-dev.mjs <email|user-uuid>');
	process.exit(1);
}

const supabase = createClient(url, serviceKey, {
	auth: { persistSession: false, autoRefreshToken: false },
});

const uuidRe =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findUserByEmail(email) {
	const normalized = email.toLowerCase();
	let page = 1;
	const perPage = 1000;
	for (;;) {
		const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
		if (error) {
			throw new Error(error.message);
		}
		const users = data.users ?? [];
		const u = users.find((x) => (x.email ?? '').toLowerCase() === normalized);
		if (u) return u;
		if (users.length < perPage) break;
		page += 1;
	}
	return null;
}

async function main() {
	let user;

	if (uuidRe.test(rawArg)) {
		const { data, error } = await supabase.auth.admin.getUserById(rawArg);
		if (error || !data?.user) {
			console.error('No auth user for id:', rawArg, error?.message ?? '');
			process.exit(1);
		}
		user = data.user;
	} else {
		const found = await findUserByEmail(rawArg);
		if (!found) {
			console.error('No auth user found with email:', rawArg);
			process.exit(1);
		}
		user = found;
	}

	const emailForLog = user.email ?? '(no email)';
	const existing = user.app_metadata ?? {};
	const { error: upErr } = await supabase.auth.admin.updateUserById(user.id, {
		app_metadata: { ...existing, role: 'admin' },
	});

	if (upErr) {
		console.error('update failed:', upErr.message);
		process.exit(1);
	}

	console.log(`Granted admin app_metadata.role for ${emailForLog} (${user.id}).`);
	console.log('Ask them to sign out and sign in again (or refresh session) so the JWT updates.');
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
