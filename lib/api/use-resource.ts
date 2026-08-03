'use client';

import { useCallback, useEffect, useState } from 'react';
import type { RequestError, RequestResult } from '@/lib/api/browser';

export type ResourceState<T> =
  { status: 'loading' } | { status: 'error'; error: RequestError } | { status: 'ready'; data: T };

/**
 * CU-868kkgb3c: carga puntual de datos con los tres estados separados.
 *
 * Cubre el caso mayoritario del repo —pedir una vez al montar y renderizar— que es
 * donde estaba el bug: `useState<T | null>(null)` usaba el mismo `null` para "cargando"
 * y para "falló", así que la pantalla se quedaba en blanco sin decir nada. Acá los tres
 * estados son un tipo discriminado y el compilador no deja leer `data` sin haber
 * descartado el error.
 *
 * **No sirve para todo a propósito.** Los listados paginados (que acumulan páginas), el
 * polling de `document-list` y los formularios con actualización optimista manejan su
 * estado a mano: forzarlos dentro de este hook pedía más opciones de las que ahorra.
 * Lo que sí comparten todos es `request()`, que es donde vive la garantía de no lanzar.
 *
 * `reload` re-dispara la petición — es lo que alimenta el botón de reintentar de
 * `LoadError`.
 */
export function useResource<T>(
  fetcher: () => Promise<RequestResult<T>>,
  deps: readonly unknown[] = [],
): { state: ResourceState<T>; reload: () => void; setData: (data: T) => void } {
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    void fetcher().then((result) => {
      // Sin esto, cambiar de recurso rápido (o desmontar) escribe la respuesta vieja
      // encima de la nueva.
      if (cancelled) return;
      setState(
        result.ok
          ? { status: 'ready', data: result.data }
          : { status: 'error', error: result.error },
      );
    });
    return () => {
      cancelled = true;
    };
    // `fetcher` se recrea en cada render de quien llama; incluirlo dispararía un bucle.
    // El contrato es que las dependencias reales van en `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  // Para las pantallas que ya tienen el dato nuevo en la mano tras una mutación y no
  // necesitan pagar otro round-trip (p. ej. el saldo que devuelve el propio insight).
  const setData = useCallback((data: T) => setState({ status: 'ready', data }), []);

  return { state, reload, setData };
}
