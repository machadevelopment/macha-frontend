'use client';

import { LoadError } from '@/components/ui/load-error';
import type { RequestError } from '@/lib/api/browser';

/**
 * CU-868kkgb3c: estado de fallo para los ocho paneles del backoffice.
 *
 * El panel admin está **100% en español por decisión pendiente** (CU-868kh8zvt, hoy
 * `blocked`): no recibe el diccionario y todos sus textos van en el JSX. Estos tres
 * mensajes siguen esa convención en vez de inventar una excepción — pero viven en UN
 * solo archivo, así que el día que se decida internacionalizar el backoffice hay un
 * único punto que tocar, no ocho.
 *
 * `forbidden` es el caso más probable de los tres acá: `admin.guard.ts` responde 403 a
 * quien no esté en la tabla `staff`, y hasta CU-868kh8xfh esa era la forma en que un
 * usuario normal descubría que el panel existía.
 */
const LABELS = {
  network: 'No se pudo conectar con el servidor. Revisa la conexión e intenta de nuevo.',
  server: 'No se pudieron cargar estos datos. Intenta de nuevo en un momento.',
  forbidden: 'No autorizado — se necesita rol staff/super_admin.',
  retry: 'Reintentar',
};

export function AdminLoadError({ error, onRetry }: { error: RequestError; onRetry?: () => void }) {
  return <LoadError error={error} labels={LABELS} onRetry={onRetry} />;
}
