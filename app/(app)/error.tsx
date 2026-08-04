'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { RouteError } from '@/components/ui/route-error';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { useClientLocale } from '@/lib/i18n/use-client-locale';

/**
 * CU-868kkgb8f criterio 1: boundary de la app de cliente.
 *
 * Las páginas de `app/(app)/` llaman a `apiFetch`, que **lanza** `ApiError` ante
 * cualquier non-2xx, y `fetch` rechaza solo si el backend no contestó. Sin este archivo
 * esa excepción subía hasta la raíz y se llevaba puesta la app entera: como macha-backend
 * (Railway) y el frontend (Vercel) son servicios que se caen por separado, una caída del
 * backend se veía como una caída total del producto.
 *
 * Al colgar del layout del grupo, el shell —sidebar, nav, cambio de empresa— sobrevive:
 * se degrada la pantalla, no la sesión.
 *
 * ## Por qué el motivo no se lee del error (criterio 5)
 *
 * En producción Next **no** entrega el error real a un boundary de cliente cuando lo lanzó
 * un Server Component: reemplaza el mensaje por uno genérico y deja solo `digest`, para no
 * filtrar detalles del servidor al navegador. Así que acá `error.status` no existe y
 * mirarlo daría un resultado distinto en dev que en producción, que es peor que no
 * mirarlo.
 *
 * La distinción 403 vs. 5xx se hace donde el status sí se conoce —del lado del servidor,
 * renderizando `<RouteError kind="denied" />` en vez de lanzar. Acá se asume
 * `unavailable`, que además es lo correcto por frecuencia: estas rutas ya pasaron por
 * `middleware.ts` y por el scoping de empresa, así que un 403 sería una anomalía, mientras
 * que un backend caído es rutina.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Criterio 4: el boundary reporta. Sin esto el fallo se degrada en silencio y deja de
  // aparecer en Sentry justo cuando empieza a verse bien para el usuario.
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const t = getDictionary(useClientLocale()).common;

  return (
    <RouteError kind="unavailable" labels={t.routeError} digest={error.digest} onRetry={reset} />
  );
}
