import * as Sentry from '@sentry/astro';

// Vercel Marketplace sets SENTRY_DSN (server-only). To enable client-side capture,
// add PUBLIC_SENTRY_DSN to Vercel with the same value (Astro requires PUBLIC_ prefix
// for browser-accessible env vars). Until then this is a graceful no-op.
Sentry.init({
	dsn: import.meta.env.PUBLIC_SENTRY_DSN,
	environment: import.meta.env.PUBLIC_VERCEL_ENV ?? 'development',
	// No performance tracing — error alerts only.
	tracesSampleRate: 0,
	enabled: Boolean(import.meta.env.PUBLIC_SENTRY_DSN),
});
