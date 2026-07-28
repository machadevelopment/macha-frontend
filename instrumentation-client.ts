import * as Sentry from '@sentry/nextjs';

// CU-868kfv9ur: no-op without a real DSN — local/dev/CI never set
// NEXT_PUBLIC_SENTRY_DSN (same pattern as every other optional integration).
// Only Railway/Vercel staging/prod get a real DSN, set out-of-band.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
