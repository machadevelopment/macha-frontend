import * as Sentry from '@sentry/nextjs';
import { resolveSentryEnvironment } from './lib/sentry-environment';

// CU-868kfv9ur: mismo no-op sin DSN que sentry.server.config.ts, para el runtime edge
// (middleware.ts corre aquí).
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // CU-868kmr1tb: mismo `environment` que server y cliente, o los tres runtimes del
    // mismo deploy caerían en buckets distintos. Ver lib/sentry-environment.ts.
    environment: resolveSentryEnvironment(
      process.env.SENTRY_ENVIRONMENT,
      process.env.VERCEL_ENV,
      process.env.NODE_ENV,
    ),
    tracesSampleRate: 0.1,
  });
}
