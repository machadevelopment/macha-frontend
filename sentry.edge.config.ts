import * as Sentry from '@sentry/nextjs';

// CU-868kfv9ur: mismo no-op sin DSN que sentry.server.config.ts, para el runtime edge
// (middleware.ts corre aquí).
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
