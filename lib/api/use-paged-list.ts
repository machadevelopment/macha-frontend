'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RequestError, RequestResult } from '@/lib/api/browser';

/** Forma común de los listados paginados del backend (`limit`/`offset` + `hasMore`). */
export interface Page<T> {
  items: T[];
  hasMore: boolean;
}

export type PagedListState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: RequestError }
  | { status: 'ready'; items: T[]; hasMore: boolean };

/**
 * CU-868kkgb3c: listado paginado con "cargar más", con el fallo contemplado.
 *
 * Los cinco listados del producto (reportes, documentos, alertas, empresas, filas en
 * staging) repetían la misma función `load(offset)` sin manejo de error, y los cinco
 * fallaban igual: `setItems` nunca ocurría, `items` se quedaba en `null` y la pantalla
 * mostraba lo mismo que si la empresa no tuviera datos. En un histórico financiero esa
 * confusión importa — "no hay alertas" y "no pudimos cargar tus alertas" son afirmaciones
 * muy distintas.
 *
 * Se distingue el fallo de la **primera** página del de una **siguiente**:
 *   - la primera falla → toda la pantalla es el error, no hay nada que mostrar;
 *   - una siguiente falla → lo ya cargado SE QUEDA y el error va junto al botón. Tirar
 *     páginas que el usuario ya tenía en pantalla por un 502 en la tercera sería
 *     castigarlo por un fallo ajeno.
 *
 * `load` recibe el offset y devuelve un `RequestResult` — el llamador adapta la forma de
 * su endpoint (`reports`/`items`/`documents`/…) a `Page<T>`.
 */

/**
 * Resultado de la PRIMERA página → estado de pantalla completa. Si falla no hay nada que
 * conservar, así que el error se queda con toda la pantalla.
 *
 * Exportada aparte del hook porque es la transición que el ticket pide cubrir con tests y
 * probarla a través de un render solo agregaría un DOM de mentira en medio.
 */
export function firstPageState<T>(result: RequestResult<Page<T>>): PagedListState<T> {
  return result.ok
    ? { status: 'ready', items: result.data.items, hasMore: result.data.hasMore }
    : { status: 'error', error: result.error };
}

/**
 * Resultado de una página SIGUIENTE → se acumula sobre lo que ya había.
 *
 * Si el estado actual ya no es `ready` (hubo un `reload` mientras la petición volaba) la
 * respuesta se descarta: pertenece a una lista que ya no está en pantalla.
 */
export function appendPageState<T>(current: PagedListState<T>, page: Page<T>): PagedListState<T> {
  if (current.status !== 'ready') return current;
  return { status: 'ready', items: [...current.items, ...page.items], hasMore: page.hasMore };
}
export function usePagedList<T>(
  load: (offset: number) => Promise<RequestResult<Page<T>>>,
  deps: readonly unknown[] = [],
) {
  const [state, setState] = useState<PagedListState<T>>({ status: 'loading' });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<RequestError | null>(null);
  const [nonce, setNonce] = useState(0);

  /**
   * Espejo del estado para leerlo fuera del render. `loadMore` necesita saber cuántos
   * items hay para calcular el offset, y no puede averiguarlo desde dentro de un updater
   * de `setState`: los updaters tienen que ser puros y en StrictMode React los invoca dos
   * veces, con lo que cada "cargar más" disparaba dos peticiones y agregaba la página
   * repetida.
   */
  const stateRef = useRef<PagedListState<T>>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    setMoreError(null);
    void load(0).then((result) => {
      if (cancelled) return;
      setState(firstPageState(result));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const loadMore = useCallback(() => {
    // El offset sale de lo que hay en pantalla, no de un contador de páginas: es lo que
    // mantiene coherente el "cargar más" tras un reintento fallido.
    const current = stateRef.current;
    if (current.status !== 'ready') return;

    setLoadingMore(true);
    setMoreError(null);
    void load(current.items.length).then((result) => {
      setLoadingMore(false);
      if (!result.ok) {
        // Lo ya cargado se queda: el error va junto al botón, no reemplaza la pantalla.
        setMoreError(result.error);
        return;
      }
      setState((latest) => appendPageState(latest, result.data));
    });
  }, [load]);

  /**
   * Reemplaza la lista visible sin volver al estado de carga — para el polling de
   * `document-list` y para refrescar después de una mutación. Si el refresco falla, se
   * conserva lo que ya estaba: un poll caído no debe vaciar la tabla.
   */
  const replace = useCallback((items: T[], hasMore: boolean) => {
    setState({ status: 'ready', items, hasMore });
  }, []);

  return { state, loadMore, loadingMore, moreError, reload, replace };
}
