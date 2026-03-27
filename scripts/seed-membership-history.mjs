/**
 * Inserts historical membership rows for one member (dev / local testing).
 *
 * Requires ALLOW_SEED_MEMBERSHIP_HISTORY=1 and SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * (loads `.env` from the repo root when present).
 *
 * Usage:
 *   ALLOW_SEED_MEMBERSHIP_HISTORY=1 node scripts/seed-membership-history.mjs --email alex@profeit.com
 *
 * Options:
 *   --email, -e         Primary or secondary email (required)
 *   --years             Comma-separated years (default: last 5 years before membership calendar year, Toronto)
 *   --prepaid-years     Comma-separated future years (default: next two years; must be > membership year)
 *   --no-prepaid        Skip prepaid (future-year) rows
 *   --dry-run, -n       Print actions only; do not insert
 *
 * Skips years that already have a membership row for that member.
 *
 * Or: npm run db:seed-membership-history -- --email you@example.com
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

function parseArgs(argv) {
	const out = {
		email: null,
		years: null,
		prepaidYears: null,
		noPrepaid: false,
		dryRun: false,
		help: false,
	};
	for (let i = 2; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--dry-run' || a === '-n') {
			out.dryRun = true;
			continue;
		}
		if (a === '--no-prepaid') {
			out.noPrepaid = true;
			continue;
		}
		if (a === '--email' || a === '-e') {
			out.email = argv[++i] ?? null;
			continue;
		}
		if (a.startsWith('--email=')) {
			out.email = a.slice('--email='.length) || null;
			continue;
		}
		if (a === '--years') {
			out.years = argv[++i] ?? null;
			continue;
		}
		if (a.startsWith('--years=')) {
			out.years = a.slice('--years='.length) || null;
			continue;
		}
		if (a === '--prepaid-years') {
			out.prepaidYears = argv[++i] ?? null;
			continue;
		}
		if (a.startsWith('--prepaid-years=')) {
			out.prepaidYears = a.slice('--prepaid-years='.length) || null;
			continue;
		}
		if (a === '-h' || a === '--help') {
			out.help = true;
		}
	}
	return out;
}

/** Same as `getMembershipCalendarYear()` (America/Toronto). */
function membershipCalendarYear() {
	const y = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'America/Toronto',
		year: 'numeric',
	}).format(new Date());
	return Number(y);
}

function defaultYears() {
	const cy = membershipCalendarYear();
	const list = [];
	for (let i = 5; i >= 1; i--) {
		list.push(cy - i);
	}
	return list;
}

/** Future years shown as “prepaid” in the member UI (year > current membership year). */
function defaultPrepaidYears(cy) {
	return [cy + 1, cy + 2];
}

function parseYearsArg(s) {
	if (!s?.trim()) return null;
	const parts = s.split(',').map((x) => x.trim());
	const years = [];
	for (const p of parts) {
		const n = Number.parseInt(p, 10);
		if (!Number.isFinite(n) || n < 1900 || n > 2100) {
			throw new Error(`Invalid year in --years: ${p}`);
		}
		years.push(n);
	}
	return [...new Set(years)].sort((a, b) => a - b);
}

async function findMemberByEmail(supabase, email) {
	const e = email.trim();
	if (!e) return null;
	const { data: m1 } = await supabase
		.from('members')
		.select('id, primary_email, last_name')
		.ilike('primary_email', e)
		.maybeSingle();
	if (m1) return m1;
	const { data: m2 } = await supabase
		.from('members')
		.select('id, primary_email, last_name')
		.ilike('secondary_email', e)
		.maybeSingle();
	return m2 ?? null;
}

const args = parseArgs(process.argv);

if (args.help) {
	console.log(`
Usage:
  ALLOW_SEED_MEMBERSHIP_HISTORY=1 node scripts/seed-membership-history.mjs --email you@example.com

Options:
  --email, -e         Member primary or secondary email (required)
  --years             Comma-separated years (default: last 5 years before membership calendar year)
  --prepaid-years     Comma-separated future years (default: next two years; must be > membership year)
  --no-prepaid        Skip prepaid / future membership rows
  --dry-run, -n       List what would be inserted; no DB writes
`);
	process.exit(0);
}

loadDotEnv();

if (process.env.ALLOW_SEED_MEMBERSHIP_HISTORY !== '1') {
	console.error(
		'Refusing to run: set ALLOW_SEED_MEMBERSHIP_HISTORY=1 (inserts membership rows).',
	);
	process.exit(1);
}

const url = process.env.SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
	console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
	process.exit(1);
}

const email = args.email?.trim();
if (!email) {
	console.error('Missing --email. Example: --email alex@profeit.com');
	process.exit(1);
}

let years;
let prepaidFutureYears;
try {
	years = args.years ? parseYearsArg(args.years) : defaultYears();
	if (args.noPrepaid) {
		prepaidFutureYears = [];
	} else if (args.prepaidYears) {
		prepaidFutureYears = parseYearsArg(args.prepaidYears);
	} else {
		prepaidFutureYears = defaultPrepaidYears(membershipCalendarYear());
	}
} catch (err) {
	console.error(err.message);
	process.exit(1);
}

const supabase = createClient(url, serviceKey, {
	auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
	const member = await findMemberByEmail(supabase, email);
	if (!member) {
		console.error(`No member found for email: ${email}`);
		process.exit(1);
	}

	const cy = membershipCalendarYear();

	console.log(
		`Member: ${member.last_name ?? '(no last name)'} (${member.primary_email ?? email}) id=${member.id}`,
	);
	console.log(`Membership calendar year (Toronto): ${cy}`);
	console.log(`Past / custom years: ${years.join(', ')}`);
	if (prepaidFutureYears.length > 0) {
		console.log(`Prepaid (future) years: ${prepaidFutureYears.join(', ')}`);
	} else {
		console.log('Prepaid (future) years: (none)');
	}

	const { data: existingRows, error: exErr } = await supabase
		.from('memberships')
		.select('year')
		.eq('member_id', member.id);
	if (exErr) {
		console.error('List memberships:', exErr.message);
		process.exit(1);
	}
	const existing = new Set((existingRows ?? []).map((r) => r.year));

	const plannedYears = new Set();
	const toInsert = [];

	function pushRow(year, tier, status, kind) {
		if (existing.has(year) || plannedYears.has(year)) {
			return false;
		}
		plannedYears.add(year);
		toInsert.push({
			member_id: member.id,
			year,
			tier,
			status,
			_kind: kind,
		});
		return true;
	}

	for (const year of years) {
		if (existing.has(year)) {
			console.log(`  skip ${year} (already exists)`);
			continue;
		}
		if (plannedYears.has(year)) {
			continue;
		}
		const tier = year % 2 === 0 ? 'general' : 'associate';
		pushRow(year, tier, 'active', 'past');
	}

	prepaidFutureYears.forEach((year, i) => {
		if (year <= cy) {
			console.warn(
				`  skip prepaid year ${year}: must be after current membership year ${cy} (use --years to add past rows)`,
			);
			return;
		}
		if (existing.has(year)) {
			console.log(`  skip ${year} prepaid (already exists)`);
			return;
		}
		if (plannedYears.has(year)) {
			console.log(`  skip ${year} prepaid (already in past/custom list)`);
			return;
		}
		const tier = year % 2 === 0 ? 'general' : 'associate';
		/* First future year paid ahead (active); next row pending so both appear in the prepaid table */
		const status = i % 2 === 0 ? 'active' : 'pending';
		pushRow(year, tier, status, 'prepaid');
	});

	if (toInsert.length === 0) {
		console.log('Nothing to insert (all years already present).');
		return;
	}

	function printRows(label, rows) {
		if (rows.length === 0) return;
		console.log(label);
		for (const row of rows) {
			console.log(`  ${row.year}  ${row.tier}  ${row.status}`);
		}
	}

	const pastRows = toInsert.filter((r) => r._kind === 'past');
	const prepaidRows = toInsert.filter((r) => r._kind === 'prepaid');
	const payload = toInsert.map(({ _kind, ...rest }) => rest);

	if (args.dryRun) {
		console.log('[dry-run] Would insert:');
		printRows('  Past / custom:', pastRows);
		printRows('  Prepaid (future):', prepaidRows);
		return;
	}

	const { error: insErr } = await supabase.from('memberships').insert(payload);
	if (insErr) {
		console.error('Insert failed:', insErr.message);
		process.exit(1);
	}

	console.log(`Inserted ${payload.length} row(s):`);
	printRows('  Past / custom:', pastRows);
	printRows('  Prepaid (future):', prepaidRows);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
