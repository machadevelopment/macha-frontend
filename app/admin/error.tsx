'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { RouteError } from '@/components/ui/route-error';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { useClientLocale } from '@/lib/i18n/use-client-locale';

/**
 * CU-868kkgb8f criterio 1: boundary del backoffice.
 *
 * Es un archivo aparte del de `app/(app)/` aunque hoy rindan lo mismo: un `error.tsx`
 * cubre su segmento y los de abajo, y `/admin/*` NO cuelga de `app/(app)/`. Sin este,
 * los ocho paneles del backoffice se quedaban sin boundary y caían al `global-error`,
 * que reemplaza la app entera y tira la nav.
 *
 * El caso de "no eres staff" no llega hasta acá: `app/admin/layout.tsx` lo resuelve antes
 * con `notFound()` (CU-868kh8xfh), para no confirmar que estas secciones existen. Lo que
 * llega acá es un panel que ya pasó el gate y cuyo backend falló — de nuevo `unavailable`
 * por el mismo motivo que en la app de cliente: en producción Next no entrega el status
 * real del error a un boundary de cliente.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const t = getDictionary(useClientLocale()).common;

  return (
    <RouteError kind="unavailable" labels={t.routeError} digest={error.digest} onRetry={reset} />
  );
}
