import * as Sentry from '@sentry/nextjs';

// CU-868kfv9ur: no-op sin DSN real — local/dev/CI nunca setean SENTRY_DSN (mismo
// patrón que instrumentation-client.ts). Solo Railway/Vercel staging/prod tienen un
// DSN real, seteado fuera de banda.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
