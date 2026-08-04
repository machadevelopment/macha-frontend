'use client';

import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * Motivo del fallo, en los términos en que le importa al usuario.
 *
 * - `unavailable`: el backend no contestó (5xx, timeout, red). Reintentar sirve.
 * - `denied`: el backend contestó que no (403). Reintentar da el mismo 403, así que no
 *   se ofrece el botón.
 */
export type RouteErrorKind = 'unavailable' | 'denied';

/**
 * CU-868kkgb8f: pantalla de un segmento que no pudo renderizar.
 *
 * Se comparte entre `app/(app)/error.tsx` y `app/admin/error.tsx` porque el contenido es
 * el mismo; lo que cambia es dónde se monta. A diferencia de `global-error`, acá el shell
 * (sidebar, nav, cambio de empresa) sigue en pie: el usuario puede irse a otra sección en
 * vez de quedarse con una pantalla muerta. Por eso esta versión sí ofrece salidas.
 */
export function RouteError({
  kind,
  labels,
  digest,
  onRetry,
}: {
  kind: RouteErrorKind;
  labels: Dictionary['common']['routeError'];
  /** Identificador que Next asigna al error; el mismo que queda en el evento de Sentry. */
  digest?: string;
  /** `reset()` del boundary. Ausente cuando reintentar no puede cambiar el resultado. */
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 p-[var(--density-main-p)]">
      <h1 className="text-h1">{labels.title}</h1>
      <p className="text-body text-muted-foreground">
        {kind === 'denied' ? labels.denied : labels.unavailable}
      </p>

      {/* En mono porque es un ID (regla de tipografía del design guide). Es lo único que
          convierte un "se me rompió" en algo buscable en Sentry. */}
      {digest && <p className="font-mono text-eyebrow uppercase text-faint">{digest}</p>}

      <div className="flex items-center gap-3">
        {/* Sin botón de reintentar en `denied`: repetir el intento da el mismo 403 y solo
            haría parecer que la app no responde. */}
        {kind !== 'denied' && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-[7px] border border-border px-3 py-1.5 text-body text-foreground transition-colors hover:bg-muted"
          >
            {labels.retry}
          </button>
        )}
        <a href="/" className="text-body underline">
          {labels.home}
        </a>
      </div>
    </div>
  );
}
