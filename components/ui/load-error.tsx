'use client';

import { RotateCw } from 'lucide-react';
import type { RequestError } from '@/lib/api/browser';
import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * CU-868kkgb3c: el estado de error de una carga de datos.
 *
 * Existe para que las ~18 pantallas que cargan datos no inventen cada una su forma de
 * fallar — que es como se llegó a que ninguna fallara de forma visible.
 *
 * Deliberadamente sobrio: un párrafo y un botón, sin ícono grande ni color de alarma.
 * El color en este producto señala semántica financiera (design guide §1), no el humor
 * de la aplicación; un listado que no cargó no es una pérdida ni un riesgo.
 */
export function LoadError({
  error,
  labels,
  onRetry,
}: {
  error: RequestError;
  labels: Dictionary['common']['loadError'];
  onRetry?: () => void;
}) {
  // Un 403 se separa porque reintentar no lo va a arreglar: el permiso no cambia por
  // insistir, y ofrecer un botón inútil es peor que no ofrecer ninguno.
  const forbidden = error.kind === 'http' && error.status === 403;
  const message = forbidden
    ? labels.forbidden
    : error.kind === 'network'
      ? labels.network
      : labels.server;

  return (
    <div role="status" className="flex flex-col items-start gap-2 py-4">
      <p className="text-body text-muted-foreground">{message}</p>
      {onRetry && !forbidden && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-[7px] border border-border px-2.5 py-1.5 text-body text-foreground transition-colors hover:bg-muted"
        >
          <RotateCw className="h-3.5 w-3.5" strokeWidth={1.7} />
          {labels.retry}
        </button>
      )}
    </div>
  );
}
