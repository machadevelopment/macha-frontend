import * as Sentry from '@sentry/nextjs';

/**
 * CU-868kfv9ur: arranca el SDK en la runtime que toque.
 *
 * CU-868kjc99f: este `register()` solo se llama si `experimental.instrumentationHook`
 * está en `true` (next.config.mjs). En Next 14 el hook viene apagado por defecto, así
 * que durante todo el tiempo que faltó esa bandera este archivo fue código muerto y
 * Sentry no se inicializó en servidor ni en edge. No tocar una sin la otra.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

/**
 * CU-868kjc99f: **hoy esto no lo llama nadie.** `onRequestError` es una convención de
 * Next 15 y este proyecto corre Next 14 (grep de `onRequestError` sobre
 * `node_modules/next/dist/server/`: cero resultados). Se conserva exportado, y no se
 * borra, porque es exactamente lo que hay que tener el día que se suba a Next 15 — y
 * porque un export inerte cuesta menos que volver a descubrir que hacía falta.
 *
 * Mientras tanto los errores de Server Components y route handlers los captura la
 * instrumentación automática que `withSentryConfig` inyecta en build, no esta línea.
 */
export const onRequestError = Sentry.captureRequestError;
