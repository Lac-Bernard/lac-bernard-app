/**
 * Backfill `payments.stripe_fee_cad` and `stripe_balance_transaction_id` for existing
 * Stripe rows by retrieving each PaymentIntent's balance transaction.
 *
 * Requires ALLOW_BACKFILL_STRIPE_FEES=1, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * STRIPE_SECRET_KEY (live key for production data). Loads repo-root `.env` when present.
 *
 * Usage:
 *   ALLOW_BACKFILL_STRIPE_FEES=1 node scripts/backfill-stripe-fees.mjs
 *
 * Options (env):
 *   BACKFILL_STRIPE_DELAY_MS — delay between Stripe calls (default 150)
 *   BACKFILL_STRIPE_PAGE_SIZE — rows per DB page (default 50)
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { loadDotEnvFromRepoRoot } from './load-dotenv.mjs';

loadDotEnvFromRepoRoot();

if (process.env.ALLOW_BACKFILL_STRIPE_FEES !== '1') {
	console.error(
		'Refusing to run: set ALLOW_BACKFILL_STRIPE_FEES=1 (writes payment fee columns via service role).',
	);
	process.exit(1);
}

const url = process.env.SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();

if (!url || !serviceKey || !stripeKey) {
	console.error(
		'Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or STRIPE_SECRET_KEY.',
	);
	process.exit(1);
}

const delayMs = Math.max(0, Number.parseInt(process.env.BACKFILL_STRIPE_DELAY_MS ?? '150', 10) || 150);
const pageSize = Math.max(1, Number.parseInt(process.env.BACKFILL_STRIPE_PAGE_SIZE ?? '50', 10) || 50);

const supabase = createClient(url, serviceKey, {
	auth: { persistSession: false, autoRefreshToken: false },
});
const stripe = new Stripe(stripeKey);

function feeFromPaymentIntent(pi) {
	const ch = pi.latest_charge;
	if (!ch || typeof ch === 'string') return null;
	const bt = ch.balance_transaction;
	if (!bt || typeof bt === 'string') return null;
	if (bt.currency !== 'cad') {
		console.warn(`Unexpected currency for ${pi.id}: ${bt.currency}`);
		return null;
	}
	return {
		feeCad: Math.round(bt.fee) / 100,
		txnId: bt.id,
	};
}

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

async function main() {
	let updated = 0;
	let skipped = 0;
	let failed = 0;

	for (;;) {
		// Always take the first page of rows still missing fee (updates remove them from the result set).
		const { data: rows, error } = await supabase
			.from('payments')
			.select('id, payment_id, amount')
			.eq('method', 'stripe')
			.like('payment_id', 'pi_%')
			.is('stripe_fee_cad', null)
			.gt('amount', 0)
			.order('id', { ascending: true })
			.range(0, pageSize - 1);

		if (error) {
			console.error('Query failed:', error);
			process.exit(1);
		}

		if (!rows?.length) break;

		let batchUpdated = 0;
		for (const row of rows) {
			const piId = row.payment_id?.trim();
			if (!piId?.startsWith('pi_')) {
				skipped += 1;
				continue;
			}

			try {
				const pi = await stripe.paymentIntents.retrieve(piId, {
					expand: ['latest_charge.balance_transaction'],
				});
				const parsed = feeFromPaymentIntent(pi);
				if (parsed == null) {
					console.warn(`No fee extracted for payment row ${row.id} (${piId})`);
					failed += 1;
				} else {
					const { error: upErr } = await supabase
						.from('payments')
						.update({
							stripe_fee_cad: parsed.feeCad,
							stripe_balance_transaction_id: parsed.txnId,
						})
						.eq('id', row.id)
						.is('stripe_fee_cad', null);

					if (upErr) {
						console.error(`Update failed row ${row.id}:`, upErr);
						failed += 1;
					} else {
						batchUpdated += 1;
						updated += 1;
						if (updated % 25 === 0) {
							console.info(`Progress: updated ${updated} …`);
						}
					}
				}
			} catch (e) {
				console.error(`Stripe retrieve failed for ${piId} (row ${row.id}):`, e?.message ?? e);
				failed += 1;
			}

			if (delayMs > 0) await sleep(delayMs);
		}

		if (rows.length > 0 && batchUpdated === 0) {
			console.error(
				'Stopping: this batch had rows but none were updated (fix errors above to avoid an infinite loop).',
			);
			process.exit(1);
		}

		if (rows.length < pageSize) break;
	}

	console.info(
		`Done. Updated: ${updated}, skipped (bad id): ${skipped}, failed: ${failed}.`,
	);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
