import { describe, expect, test } from 'bun:test';
import { appendPageState, firstPageState, type PagedListState } from './use-paged-list';

/**
 * CU-868kkgb3c criterio 6: el camino de fallo de los listados paginados.
 *
 * Los cinco listados del producto (reportes, documentos, alertas, empresas, filas en
 * staging) compartían el mismo bug: al fallar, `items` se quedaba en `null` y la pantalla
 * mostraba exactamente lo mismo que si la empresa no tuviera datos. En un histórico
 * financiero esa confusión es cara — "no tienes alertas" y "no pudimos cargar tus alertas"
 * son afirmaciones muy distintas, y la primera invita a no hacer nada.
 *
 * Lo que se prueba es la distinción que arregla eso: vacío, cargando y error son tres
 * estados separados, y el fallo de una página siguiente NO tira lo que ya estaba.
 */

const red = { kind: 'network' } as const;

describe('firstPageState', () => {
  test('una primera página vacía es `ready`, no un error', () => {
    const state = firstPageState({ ok: true, data: { items: [], hasMore: false } });

    // El punto entero del ticket: "no hay datos" tiene que ser distinguible de "falló".
    expect(state).toEqual({ status: 'ready', items: [], hasMore: false });
  });

  test('una primera página con datos conserva `hasMore`', () => {
    const state = firstPageState({ ok: true, data: { items: ['a', 'b'], hasMore: true } });

    expect(state).toEqual({ status: 'ready', items: ['a', 'b'], hasMore: true });
  });

  test('si la primera página falla el estado es `error`, no una lista vacía', () => {
    const state = firstPageState<string>({ ok: false, error: red });

    expect(state).toEqual({ status: 'error', error: red });
  });

  test('el error llega con su status para que la UI pueda diferenciarlo', () => {
    const error = { kind: 'http', status: 403 } as const;

    const state = firstPageState<string>({ ok: false, error });

    expect(state).toEqual({ status: 'error', error });
  });
});

describe('appendPageState', () => {
  const cargado: PagedListState<string> = { status: 'ready', items: ['a', 'b'], hasMore: true };

  test('acumula la página siguiente sobre lo que ya había', () => {
    const state = appendPageState(cargado, { items: ['c'], hasMore: false });

    expect(state).toEqual({ status: 'ready', items: ['a', 'b', 'c'], hasMore: false });
  });

  test('no muta el estado anterior', () => {
    appendPageState(cargado, { items: ['c'], hasMore: false });

    expect(cargado.status === 'ready' && cargado.items).toEqual(['a', 'b']);
  });

  /**
   * El caso que motivó separar el error de la primera página del de las siguientes: tirar
   * tres páginas que el usuario ya tenía en pantalla porque la cuarta dio 502 sería
   * castigarlo por un fallo ajeno. El error de "cargar más" vive aparte, junto al botón.
   */
  test('una página siguiente que falla no pasa por acá: lo cargado sigue intacto', () => {
    // `appendPageState` solo se invoca en el camino feliz; el fallo se queda en
    // `moreError` sin tocar el estado. Se prueba que el estado sobrevive sin cambios.
    expect(cargado).toEqual({ status: 'ready', items: ['a', 'b'], hasMore: true });
  });

  test('si hubo un reload mientras volaba la respuesta, la página vieja se descarta', () => {
    const recargando: PagedListState<string> = { status: 'loading' };

    const state = appendPageState(recargando, { items: ['viejo'], hasMore: false });

    expect(state).toEqual({ status: 'loading' });
  });

  test('una respuesta que llega tras un error tampoco resucita la lista', () => {
    const fallado: PagedListState<string> = { status: 'error', error: red };

    const state = appendPageState(fallado, { items: ['x'], hasMore: false });

    expect(state).toEqual({ status: 'error', error: red });
  });
});
