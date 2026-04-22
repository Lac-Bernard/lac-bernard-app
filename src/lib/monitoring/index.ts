import * as Sentry from '@sentry/astro';

/**
 * Capture an unexpected Error or thrown value. Use for exceptions that should
 * never happen in normal operation (DB errors, RPC failures, etc.).
 */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
	Sentry.captureException(err, context ? { extra: context } : undefined);
}

/**
 * Capture a named alert for a bad-but-non-throwing outcome (e.g. Stripe amount
 * mismatch that returns { code: 'skip' } instead of throwing). Fires an error-
 * level event so Sentry's alert rules trigger the same as exceptions.
 */
export function captureAlert(message: string, context?: Record<string, unknown>): void {
	Sentry.captureMessage(message, {
		level: 'error',
		extra: context,
	});
}
