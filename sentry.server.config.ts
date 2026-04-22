import * as Sentry from '@sentry/astro';

Sentry.init({
	dsn: process.env.SENTRY_DSN,
	environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
	// No performance tracing — error alerts only.
	tracesSampleRate: 0,
	// Gracefully no-op if DSN is not set (local dev without Sentry configured).
	enabled: Boolean(process.env.SENTRY_DSN),
});
