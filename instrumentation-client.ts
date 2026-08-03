import * as Sentry from '@sentry/nextjs';

// CU-868kfv9ur: no-op without a real DSN — local/dev/CI never set
// NEXT_PUBLIC_SENTRY_DSN (same pattern as every other optional integration).
// Only Railway/Vercel staging/prod get a real DSN, set out-of-band.
//
// CU-868kjc99f: este archivo **solo llega al navegador gracias a `withSentryConfig`**.
// `instrumentation-client.ts` es una convención de Next 15.3+ y acá corre Next 14: quien
// lo mete al entry de webpack es el plugin de Sentry, no el framework. Sin el wrapper en
// `next.config.mjs` esto era código muerto y el navegador nunca reportó nada.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}

/**
 * Instrumentación de navegaciones del App Router — el SDK la exige explícitamente en
 * build ("ACTION REQUIRED: To instrument navigations...").
 *
 * Igual que `onRequestError` en `instrumentation.ts`, **hoy Next 14 no invoca este
 * hook**: es una convención de Next 15.3+. Se exporta ahora porque es lo que el SDK
 * pide, porque queda listo para el salto de versión, y porque sin él el build repite un
 * ACTION REQUIRED que acaba normalizando el ruido en el log.
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
