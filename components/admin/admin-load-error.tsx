'use client';

import { LoadError } from '@/components/ui/load-error';
import type { RequestError } from '@/lib/api/browser';
import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * CU-868kkgb3c: estado de fallo para los ocho paneles del backoffice.
 *
 * CU-868kh8zvt: los tres mensajes ya no viven aquí en español. La decisión de Jose
 * (2026-07-28) internacionaliza el backoffice — no por operación, sino porque el panel
 * admin es donde se demuestra la maquinaria del producto ante inversionistas, y
 * mostrarlo a medias resta en el peor momento posible. Los textos salen ahora de
 * `t.admin.common.loadError`, con paridad ES/EN como el resto de la app.
 *
 * `forbidden` es el caso más probable de los tres acá: `admin.guard.ts` responde 403 a
 * quien no esté en la tabla `staff`, y hasta CU-868kh8xfh esa era la forma en que un
 * usuario normal descubría que el panel existía.
 */
export function AdminLoadError({
  error,
  labels,
  onRetry,
}: {
  error: RequestError;
  labels: Dictionary['admin']['common']['loadError'];
  onRetry?: () => void;
}) {
  return <LoadError error={error} labels={labels} onRetry={onRetry} />;
}
