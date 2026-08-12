import * as Sentry from '@sentry/nextjs';
import { resolveSentryEnvironment } from './lib/sentry-environment';

// CU-868kfv9ur: no-op sin DSN real — local/dev/CI nunca setean SENTRY_DSN (mismo
// patrón que instrumentation-client.ts). Solo Railway/Vercel staging/prod tienen un
// DSN real, seteado fuera de banda.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // CU-868kmr1tb: sin esto, preview y producción etiquetaban igual. Ver
    // lib/sentry-environment.ts.
    environment: resolveSentryEnvironment(
      process.env.SENTRY_ENVIRONMENT,
      process.env.VERCEL_ENV,
      process.env.NODE_ENV,
    ),
    tracesSampleRate: 0.1,
  });
} else if (process.env.VERCEL_ENV === 'production') {
  // CU-868kmr1tb: el no-op silencioso es correcto en local y peligroso en un deploy. La
  // auditoría del 2026-08-05 encontró producción sirviendo a un cliente real sin una sola
  // captura de errores, y nada lo decía. Este log sale en los Runtime Logs de Vercel.
  console.warn(
    '[sentry] SIN MONITOREO DE ERRORES: SENTRY_DSN no está seteada en el deploy de ' +
      'producción. Ver README §Observabilidad.',
  );
}
