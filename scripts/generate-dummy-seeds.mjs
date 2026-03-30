/**
 * Dummy database seed for local dev and admin UI testing.
 *
 * Three “reset” ideas (different tools — not interchangeable):
 *
 * 1. `npm run db:seed` — writes `supabase/seed.sql` only (no DB).
 * 2. `npm run db:seed:local` — (1) then `supabase db reset`: **full local DB** wipe + migrations + seed.
 * 3. `npm run db:seed:apply` / `db:seed:apply:reset` — insert via API into whatever DB `.env` points at.
 *    `--reset` here deletes **only** rows tagged with the dummy seed marker, then re-inserts (needs
 *    `ALLOW_DUMMY_SEED_RESET=1`). Unlike `db:import-members-csv --reset`, it does not truncate all members.
 *
 * See also: `scripts/load-dotenv.mjs` (shared `.env` load), `generate_supabase_csvs.py --reset` (full import wipe).
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { loadDotEnvFromRepoRoot } from './load-dotenv.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const OUT = join(root, 'supabase', 'seed.sql');

/** Wipe / idempotency (also embedded in member notes) */
const SEED_MARKER = 'Dashboard dummy seed · __dummy_seed__';

const AUDIT_ACTION_PREFIX = 'dummy_seed_';
const AUDIT_ACTOR = '00000000-0000-4000-8000-00000000c0de';

function uid(n) {
	const hex = n.toString(16).padStart(12, '0').slice(-12);
	return `aaaaaaaa-aaaa-4aaa-8aaa-${hex}`;
}

function membershipCalendarYear() {
	const y = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'America/Toronto',
		year: 'numeric',
	}).format(new Date());
	return Number(y);
}

function parseArgs(argv) {
	let dryRun = false;
	let reset = false;
	let apply = false;
	let cyOverride = null;
	let help = false;
	for (let i = 2; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--dry-run' || a === '-n') dryRun = true;
		else if (a === '--reset') reset = true;
		else if (a === '--apply') apply = true;
		else if (a === '-h' || a === '--help') help = true;
		else if (a.startsWith('--cy=')) cyOverride = Number(a.slice('--cy='.length));
		else if (a === '--cy') cyOverride = Number(argv[++i]);
	}
	return { dryRun, reset, apply, cyOverride, help };
}

function printUsage() {
	console.log(`Usage: node scripts/generate-dummy-seeds.mjs [options]

Write supabase/seed.sql (default) or apply dummy rows to Supabase.

npm shortcuts:
  npm run db:seed                  Regenerate seed.sql only (no database).
  npm run db:seed:local            Regenerate seed.sql + supabase db reset (full local wipe).
  npm run db:seed:apply            Insert via API (requires ALLOW_DUMMY_SEED_APPLY=1).
  npm run db:seed:apply:reset      Apply after removing prior dummy seed (also ALLOW_DUMMY_SEED_RESET=1).

Options:
  --apply              Connect with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY and insert rows.
  --reset              With --apply: delete prior dummy-tagged rows first (needs ALLOW_DUMMY_SEED_RESET=1).
  --dry-run, -n        With --apply: print only, no writes.
  --cy, --cy=YYYY      Membership calendar year in generated data (default: Toronto calendar year).
  -h, --help           Show this message.

Other scripts use different flags: CSV import uses --reset to wipe members/memberships/payments;
this script’s --reset only applies with --apply and only removes dummy seed rows.`);
}

function sqlText(s) {
	if (s == null || s === '') return 'NULL';
	return `'${String(s).replace(/'/g, "''")}'`;
}

function sqlUuid(u) {
	return `'${u}'::uuid`;
}

function sqlNum(n) {
	if (n === '' || n == null || Number.isNaN(n)) return 'NULL';
	return String(n);
}

function sqlDate(d) {
	return d ? sqlText(d) : 'NULL';
}

function sqlTs(iso) {
	return iso ? `${sqlText(iso)}::timestamptz` : 'NULL';
}

function sqlJsonb(obj) {
	if (obj == null) return 'NULL';
	return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

function buildDataset(cy) {
	const M = {
		alex: uid(1),
		marie: uid(2),
		jean: uid(3),
		sophie: uid(4),
		lucas: uid(5),
		emma: uid(6),
		noah: uid(7),
		chloe: uid(8),
		marc: uid(9),
		julie: uid(10),
		/** members.status = new — appears on New members tab; verify flow */
		nova: uid(11),
		/** members.status = disabled — soft-off; excluded from default directory / exports */
		riley: uid(12),
	};

	const members = [
		{
			id: M.alex,
			first_name: 'Alex',
			last_name: 'Profeit',
			primary_email: 'alex.devseed@example.invalid',
			secondary_email: null,
			primary_phone: '514-555-0101',
			primary_city: 'Montréal',
			primary_province: 'QC',
			primary_country: 'CA',
			email_opt_in: true,
			notes: SEED_MARKER,
			status: 'verified',
		},
		{
			id: M.marie,
			first_name: 'Marie',
			last_name: 'Dubois',
			primary_email: 'marie.devseed@example.invalid',
			secondary_email: 'marie.alt@example.invalid',
			primary_phone: '514-555-0102',
			primary_city: 'Gatineau',
			primary_province: 'QC',
			email_opt_in: true,
			notes: SEED_MARKER,
			status: 'verified',
		},
		{
			id: M.jean,
			first_name: 'Jean',
			last_name: 'Tremblay',
			primary_email: 'jean.devseed@example.invalid',
			primary_phone: '418-555-0103',
			primary_city: 'Québec',
			primary_province: 'QC',
			email_opt_in: false,
			notes: SEED_MARKER,
			status: 'verified',
		},
		{
			id: M.sophie,
			first_name: 'Sophie',
			last_name: 'Lavoie',
			primary_email: 'sophie.devseed@example.invalid',
			primary_phone: '450-555-0104',
			primary_city: 'Laval',
			primary_province: 'QC',
			email_opt_in: true,
			notes: SEED_MARKER,
			status: 'verified',
		},
		{
			id: M.lucas,
			first_name: 'Lucas',
			last_name: 'Martin',
			primary_email: 'lucas.devseed@example.invalid',
			primary_phone: '819-555-0105',
			primary_city: 'Sherbrooke',
			primary_province: 'QC',
			email_opt_in: true,
			notes: SEED_MARKER,
			status: 'verified',
		},
		{
			id: M.emma,
			first_name: 'Emma',
			last_name: 'Fortin',
			primary_email: 'emma.devseed@example.invalid',
			primary_phone: '438-555-0106',
			primary_city: 'Montréal',
			primary_province: 'QC',
			email_opt_in: true,
			notes: SEED_MARKER,
			status: 'verified',
		},
		{
			id: M.noah,
			first_name: 'Noah',
			last_name: 'Bergeron',
			primary_email: 'noah.devseed@example.invalid',
			primary_phone: '514-555-0107',
			primary_city: 'Montréal',
			primary_province: 'QC',
			email_opt_in: true,
			notes: SEED_MARKER,
			status: 'verified',
		},
		{
			id: M.chloe,
			first_name: 'Chloé',
			last_name: 'Gagnon',
			primary_email: 'chloe.devseed@example.invalid',
			primary_phone: '514-555-0108',
			primary_city: 'Longueuil',
			primary_province: 'QC',
			email_opt_in: true,
			notes: SEED_MARKER,
			status: 'verified',
		},
		{
			id: M.marc,
			first_name: 'Marc',
			last_name: 'Pelletier',
			primary_email: 'marc.devseed@example.invalid',
			primary_phone: '418-555-0109',
			primary_city: 'Rimouski',
			primary_province: 'QC',
			email_opt_in: false,
			notes: SEED_MARKER,
			status: 'verified',
		},
		{
			id: M.julie,
			first_name: 'Julie',
			last_name: 'Roy',
			primary_email: 'julie.devseed@example.invalid',
			primary_phone: '450-555-0110',
			primary_city: 'Terrebonne',
			primary_province: 'QC',
			email_opt_in: true,
			notes: SEED_MARKER,
			status: 'verified',
		},
		{
			id: M.nova,
			first_name: 'Nova',
			last_name: 'Review',
			primary_email: 'nova.newsignup.devseed@example.invalid',
			secondary_email: null,
			primary_phone: '514-555-0199',
			primary_city: 'Montréal',
			primary_province: 'QC',
			primary_country: 'CA',
			email_opt_in: true,
			notes: `${SEED_MARKER} · members.status=new (self-serve; use New members tab + Verify)`,
			status: 'new',
		},
		{
			id: M.riley,
			first_name: 'Riley',
			last_name: 'Former',
			primary_email: 'inactive.sheet.devseed@example.invalid',
			secondary_email: null,
			primary_phone: '450-555-0198',
			primary_city: 'Blainville',
			primary_province: 'QC',
			primary_country: 'CA',
			email_opt_in: false,
			notes: `${SEED_MARKER} · members.status=disabled (import “inactive” / soft-off)`,
			status: 'disabled',
		},
	];

	let k = 20;
	const mid = () => uid(k++);

	const memberships = [];

	memberships.push(
		{
			id: mid(),
			member_id: M.alex,
			year: cy - 2,
			tier: 'general',
			status: 'active',
			created_at: `${cy - 2}-05-10T14:00:00Z`,
		},
		{
			id: mid(),
			member_id: M.alex,
			year: cy - 1,
			tier: 'general',
			status: 'active',
			created_at: `${cy - 1}-04-02T11:20:00Z`,
		},
		{
			id: mid(),
			member_id: M.alex,
			year: cy,
			tier: 'general',
			status: 'pending',
			created_at: `${cy}-03-01T09:00:00Z`,
		},
	);

	const marieCy = mid();
	memberships.push({
		id: marieCy,
		member_id: M.marie,
		year: cy,
		tier: 'general',
		status: 'active',
		created_at: `${cy}-03-18T16:45:00Z`,
	});

	const jeanCy = mid();
	memberships.push({
		id: jeanCy,
		member_id: M.jean,
		year: cy,
		tier: 'associate',
		status: 'active',
		created_at: `${cy}-03-12T10:15:00Z`,
	});

	const sophieIds = [mid(), mid(), mid()];
	memberships.push(
		{
			id: sophieIds[0],
			member_id: M.sophie,
			year: cy - 2,
			tier: 'associate',
			status: 'active',
			created_at: `${cy - 2}-06-01T12:00:00Z`,
		},
		{
			id: sophieIds[1],
			member_id: M.sophie,
			year: cy - 1,
			tier: 'general',
			status: 'active',
			created_at: `${cy - 1}-05-20T12:00:00Z`,
		},
		{
			id: sophieIds[2],
			member_id: M.sophie,
			year: cy,
			tier: 'general',
			status: 'active',
			created_at: `${cy}-03-05T13:30:00Z`,
		},
	);

	for (const [midM, tier] of [
		[M.lucas, 'general'],
		[M.marc, 'general'],
		[M.julie, 'associate'],
	]) {
		memberships.push({
			id: mid(),
			member_id: midM,
			year: cy,
			tier,
			status: 'pending',
			created_at: `${cy}-03-${String(10 + memberships.length % 15).padStart(2, '0')}T08:00:00Z`,
		});
	}

	memberships.push({
		id: mid(),
		member_id: M.emma,
		year: cy + 2,
		tier: 'general',
		status: 'pending',
		created_at: `${cy}-03-22T15:00:00Z`,
	});

	const noahPrev = mid();
	memberships.push({
		id: noahPrev,
		member_id: M.noah,
		year: cy - 1,
		tier: 'general',
		status: 'active',
		created_at: `${cy - 1}-07-01T12:00:00Z`,
	});

	const chloeCy = mid();
	memberships.push({
		id: chloeCy,
		member_id: M.chloe,
		year: cy,
		tier: 'general',
		status: 'active',
		created_at: `${cy}-03-25T18:10:00Z`,
	});

	const novaPendingCy = mid();
	memberships.push({
		id: novaPendingCy,
		member_id: M.nova,
		year: cy,
		tier: 'general',
		status: 'pending',
		created_at: `${cy}-03-28T10:00:00Z`,
	});

	const rileyPrevYear = mid();
	memberships.push({
		id: rileyPrevYear,
		member_id: M.riley,
		year: cy - 1,
		tier: 'general',
		status: 'active',
		created_at: `${cy - 1}-09-01T12:00:00Z`,
	});

	const stripeNotes = (sessionId, donationDollars, donationNote) => {
		const parts = ['Stripe Checkout', `session ${sessionId}`, `donation $${donationDollars.toFixed(2)} CAD`];
		if (donationNote) parts.push(`Donation note: ${donationNote}`);
		return parts.join(' · ');
	};

	const payments = [
		{
			membership_id: memberships.find((m) => m.member_id === M.alex && m.year === cy - 2).id,
			method: 'e-transfer',
			amount: 75,
			date: `${cy - 2}-05-12`,
			notes: 'Renewal · e-Transfer',
			payment_id: null,
			membership_amount: 75,
			donation_amount: 0,
			donation_note: null,
		},
		{
			membership_id: memberships.find((m) => m.member_id === M.alex && m.year === cy - 1).id,
			method: 'cheque',
			amount: 75,
			date: `${cy - 1}-04-05`,
			notes: null,
			payment_id: null,
			membership_amount: 75,
			donation_amount: 0,
			donation_note: null,
		},
		{
			membership_id: marieCy,
			method: 'stripe',
			amount: 125,
			date: `${cy}-03-19`,
			notes: stripeNotes('cs_devseed_marie_01', 50, 'Lake cleanup fund'),
			payment_id: 'pi_devseed_marie_001',
			membership_amount: 75,
			donation_amount: 50,
			donation_note: 'Lake cleanup fund',
		},
		{
			membership_id: jeanCy,
			method: 'e-transfer',
			amount: 25,
			date: `${cy}-03-13`,
			notes: 'Cotisation associé',
			payment_id: null,
			membership_amount: 25,
			donation_amount: 0,
			donation_note: null,
		},
		{
			membership_id: sophieIds[0],
			method: 'cash',
			amount: 25,
			date: `${cy - 2}-06-03`,
			notes: null,
			payment_id: null,
			membership_amount: 25,
			donation_amount: 0,
			donation_note: null,
		},
		{
			membership_id: sophieIds[1],
			method: 'e-transfer',
			amount: 75,
			date: `${cy - 1}-05-22`,
			notes: null,
			payment_id: null,
			membership_amount: 75,
			donation_amount: 0,
			donation_note: null,
		},
		{
			membership_id: sophieIds[2],
			method: 'stripe',
			amount: 75,
			date: `${cy}-03-06`,
			notes: stripeNotes('cs_devseed_sophie_01', 0, ''),
			payment_id: 'pi_devseed_sophie_001',
			membership_amount: 75,
			donation_amount: 0,
			donation_note: null,
		},
		{
			membership_id: noahPrev,
			method: 'unknown',
			amount: 75,
			date: `${cy - 1}-07-05`,
			notes: null,
			payment_id: null,
			membership_amount: 75,
			donation_amount: 0,
			donation_note: null,
		},
		{
			membership_id: chloeCy,
			method: 'cheque',
			amount: 75,
			date: `${cy}-03-26`,
			notes: 'Chèque #1042',
			payment_id: null,
			membership_amount: 75,
			donation_amount: 0,
			donation_note: null,
		},
		{
			membership_id: rileyPrevYear,
			method: 'e-transfer',
			amount: 75,
			date: `${cy - 1}-09-03`,
			notes: 'Prior year (row marked inactive in sheet)',
			payment_id: null,
			membership_amount: 75,
			donation_amount: 0,
			donation_note: null,
		},
	];

	const audit = [
		{
			actor_user_id: AUDIT_ACTOR,
			action: `${AUDIT_ACTION_PREFIX}record_manual_payment`,
			entity_type: 'membership',
			entity_id: String(marieCy),
			metadata: { source: 'dummy_seed', label: 'Synthetic manual payment' },
		},
		{
			actor_user_id: AUDIT_ACTOR,
			action: `${AUDIT_ACTION_PREFIX}export_emails`,
			entity_type: null,
			entity_id: null,
			metadata: { source: 'dummy_seed', count: 8 },
		},
		{
			actor_user_id: AUDIT_ACTOR,
			action: `${AUDIT_ACTION_PREFIX}promote_admin`,
			entity_type: 'member',
			entity_id: M.alex,
			metadata: { source: 'dummy_seed' },
		},
		{
			actor_user_id: AUDIT_ACTOR,
			action: `${AUDIT_ACTION_PREFIX}patch_member`,
			entity_type: 'member',
			entity_id: M.jean,
			metadata: { source: 'dummy_seed', fields: ['primary_phone'] },
		},
		{
			actor_user_id: AUDIT_ACTOR,
			action: `${AUDIT_ACTION_PREFIX}view_activity`,
			entity_type: null,
			entity_id: null,
			metadata: { source: 'dummy_seed' },
		},
	];

	return { members, memberships, payments, audit, cy };
}

function buildSeedSql(dataset) {
	const { members, memberships, payments, audit, cy } = dataset;

	const memberValues = members
		.map(
			(m) =>
				`(${[
					sqlUuid(m.id),
					sqlText(m.first_name),
					sqlText(m.last_name),
					sqlText(m.primary_email),
					sqlText(m.secondary_email),
					sqlText(m.primary_phone),
					'NULL',
					'NULL',
					'NULL',
					'NULL',
					'NULL',
					sqlText(m.primary_city),
					sqlText(m.primary_province),
					sqlText(m.primary_country),
					'NULL',
					m.email_opt_in ? 'true' : 'false',
					sqlText(m.notes),
					sqlText(m.status),
				].join(', ')})`,
		)
		.join(',\n  ');

	const membershipValues = memberships
		.map(
			(r) =>
				`(${[sqlUuid(r.id), sqlUuid(r.member_id), String(r.year), sqlText(r.tier), sqlText(r.status), sqlTs(r.created_at)].join(', ')})`,
		)
		.join(',\n  ');

	const paymentValues = payments
		.map(
			(p) =>
				`(${[
					sqlUuid(p.membership_id),
					sqlText(p.method),
					sqlNum(p.amount),
					sqlDate(p.date),
					sqlText(p.notes),
					sqlText(p.payment_id),
					sqlNum(p.membership_amount),
					sqlNum(p.donation_amount),
					sqlText(p.donation_note),
				].join(', ')})`,
		)
		.join(',\n  ');

	const auditValues = audit
		.map(
			(a) =>
				`(${[sqlUuid(a.actor_user_id), sqlText(a.action), sqlText(a.entity_type), sqlText(a.entity_id), sqlJsonb(a.metadata)].join(', ')})`,
		)
		.join(',\n  ');

	return `-- Generated by scripts/generate-dummy-seeds.mjs — run: npm run db:seed
-- Membership calendar year used: ${cy} (America/Toronto). Override with --cy=YYYY when generating.

begin;

truncate table public.payments, public.memberships, public.members, public.admin_audit_log restart identity cascade;

insert into public.members (
  id, first_name, last_name, primary_email, secondary_email,
  primary_phone, secondary_phone, lake_phone, lake_civic_number, lake_street_name,
  primary_address, primary_city, primary_province, primary_country, primary_postal_code,
  email_opt_in, notes, status
) values
  ${memberValues};

insert into public.memberships (id, member_id, year, tier, status, created_at) values
  ${membershipValues};

insert into public.payments (membership_id, method, amount, date, notes, payment_id, membership_amount, donation_amount, donation_note) values
  ${paymentValues};

insert into public.admin_audit_log (actor_user_id, action, entity_type, entity_id, metadata) values
  ${auditValues};

commit;
`;
}

async function wipeSeed(supabase) {
	const { data: marked, error: e1 } = await supabase
		.from('members')
		.select('id')
		.like('notes', '%__dummy_seed__%');
	if (e1) throw new Error(`List seed members: ${e1.message}`);
	const memberIds = (marked ?? []).map((r) => r.id);
	if (memberIds.length === 0) {
		console.log('No previous dummy seed members found (notes marker).');
	} else {
		const { data: ms, error: e2 } = await supabase.from('memberships').select('id').in('member_id', memberIds);
		if (e2) throw new Error(`List seed memberships: ${e2.message}`);
		const mshipIds = (ms ?? []).map((r) => r.id);
		if (mshipIds.length > 0) {
			const { error: e3 } = await supabase.from('payments').delete().in('membership_id', mshipIds);
			if (e3) throw new Error(`Delete seed payments: ${e3.message}`);
		}
		const { error: e4 } = await supabase.from('memberships').delete().in('member_id', memberIds);
		if (e4) throw new Error(`Delete seed memberships: ${e4.message}`);
		const { error: e5 } = await supabase.from('members').delete().in('id', memberIds);
		if (e5) throw new Error(`Delete seed members: ${e5.message}`);
		console.log(`Removed previous dummy seed: ${memberIds.length} member(s).`);
	}

	const { error: e6 } = await supabase.from('admin_audit_log').delete().like('action', `${AUDIT_ACTION_PREFIX}%`);
	if (e6) throw new Error(`Delete seed audit: ${e6.message}`);
}

async function applyDataset(supabase, dataset, { reset, dryRun }) {
	if (dryRun) {
		console.log('[dry-run] No database changes.');
		return;
	}
	if (reset) {
		await wipeSeed(supabase);
	}

	const { error: em } = await supabase.from('members').insert(dataset.members);
	if (em) {
		if (em.code === '23505') {
			console.error(
				'Insert failed (duplicate). Run with --reset if you have ALLOW_DUMMY_SEED_RESET=1 to replace the previous seed.',
			);
		}
		console.error('Insert members:', em.message);
		process.exit(1);
	}

	const { error: ems } = await supabase.from('memberships').insert(dataset.memberships);
	if (ems) {
		console.error('Insert memberships:', ems.message);
		process.exit(1);
	}

	const { error: ep } = await supabase.from('payments').insert(dataset.payments);
	if (ep) {
		console.error('Insert payments:', ep.message);
		process.exit(1);
	}

	const { error: ea } = await supabase.from('admin_audit_log').insert(dataset.audit);
	if (ea) {
		console.error('Insert admin_audit_log:', ea.message);
		process.exit(1);
	}

	console.log('Applied dummy seed to Supabase. Check the admin dashboard (Overview, Pending, Members).');
}

async function main() {
	loadDotEnvFromRepoRoot();
	const args = parseArgs(process.argv);
	if (args.help) {
		printUsage();
		return;
	}
	const cy =
		args.cyOverride != null && Number.isFinite(args.cyOverride) && args.cyOverride >= 2000 && args.cyOverride <= 2100
			? args.cyOverride
			: membershipCalendarYear();
	const dataset = buildDataset(cy);

	console.log(`Membership calendar year: ${cy}`);
	console.log(
		`Dataset: ${dataset.members.length} members, ${dataset.memberships.length} memberships, ${dataset.payments.length} payments, ${dataset.audit.length} audit rows`,
	);

	if (args.apply) {
		if (process.env.ALLOW_DUMMY_SEED_APPLY !== '1') {
			console.error('Refusing --apply: set ALLOW_DUMMY_SEED_APPLY=1');
			process.exit(1);
		}
		if (args.reset && process.env.ALLOW_DUMMY_SEED_RESET !== '1') {
			console.error('Refusing --reset: set ALLOW_DUMMY_SEED_RESET=1');
			process.exit(1);
		}
		const url = process.env.SUPABASE_URL?.trim();
		const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
		if (!url || !serviceKey) {
			console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
			process.exit(1);
		}
		const supabase = createClient(url, serviceKey, {
			auth: { persistSession: false, autoRefreshToken: false },
		});
		await applyDataset(supabase, dataset, { reset: args.reset, dryRun: args.dryRun });
		return;
	}

	const sql = buildSeedSql(dataset);
	writeFileSync(OUT, sql, 'utf8');
	console.log(
		`Wrote ${OUT} (${dataset.members.length} members, ${dataset.memberships.length} memberships, ${dataset.payments.length} payments, ${dataset.audit.length} audit rows).`,
	);
	console.log('Load with: supabase db reset (local) or apply migrations + seed on your environment.');
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
