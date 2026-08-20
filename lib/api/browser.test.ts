import { afterEach, describe, expect, test } from 'bun:test';

import { errorMessage, request, requestJson } from './browser';

/**
 * CU-868kkgb3c criterio 6: el camino de fallo, que es justo el que no tenía cobertura.
 *
 * El bug original no era que el fetch fallara —eso va a pasar siempre, backend y frontend
 * son dos servicios separados— sino que fallara en silencio: `r.json()` lanzando dentro de
 * un `.then()` sin `.catch()`, la promesa rechazada sin dueño y la pantalla en blanco para
 * siempre. Por eso el contrato que se prueba acá es "nunca lanza, nunca rechaza": si
 * `request` puede rechazar, todo lo construido encima vuelve a tener el mismo agujero.
 */

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Sustituye `fetch` por una respuesta fija. Devuelve las llamadas que recibió. */
function stubFetch(impl: (input: string, init?: RequestInit) => Promise<Response>) {
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  globalThis.fetch = ((input: string, init?: RequestInit) => {
    calls.push({ input, init });
    return impl(input, init);
  }) as unknown as typeof fetch;
  return calls;
}

describe('request', () => {
  test('2xx con JSON válido devuelve los datos', async () => {
    stubFetch(async () => Response.json({ items: [1, 2] }));

    const result = await request<{ items: number[] }>('/api/reports');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.items).toEqual([1, 2]);
  });

  test('fetch que rechaza se clasifica como red, no propaga', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));

    const result = await request('/api/reports');

    expect(result).toEqual({ ok: false, error: { kind: 'network' } });
  });

  /**
   * El caso exacto del ticket: un 502 de proxy contesta HTML. Antes `r.json()` lanzaba
   * sobre ese cuerpo y la rejection se perdía; acá el status manda y el cuerpo ilegible
   * no cambia el diagnóstico.
   */
  test('non-2xx con cuerpo HTML conserva el status y no se convierte en error de parseo', async () => {
    stubFetch(async () => new Response('<html>502 Bad Gateway</html>', { status: 502 }));

    const result = await request('/api/dashboard');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('http');
      expect(result.error.status).toBe(502);
      expect(result.error.body).toBeUndefined();
    }
  });

  test('non-2xx con cuerpo JSON lo conserva para que la UI pueda usarlo', async () => {
    stubFetch(async () =>
      Response.json({ error: 'insufficient_credits', required: 5, balance: 2 }, { status: 402 }),
    );

    const result = await request('/api/insights', { method: 'POST' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(402);
      expect(result.error.body).toEqual({ error: 'insufficient_credits', required: 5, balance: 2 });
    }
  });

  /** Criterio 5: 403, 409 y 500 tienen que llegar distinguibles a la UI. */
  test.each([403, 409, 500])('el status %i llega intacto', async (status) => {
    stubFetch(async () => Response.json({ error: 'nope' }, { status }));

    const result = await request('/api/documents/1/revert', { method: 'POST' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.status).toBe(status);
  });

  test('2xx con cuerpo no-JSON es error de parseo, no datos vacíos', async () => {
    stubFetch(async () => new Response('<html>hola</html>', { status: 200 }));

    const result = await request('/api/alerts');

    expect(result).toEqual({ ok: false, error: { kind: 'parse' } });
  });

  test('un 204 sin cuerpo no se hace pasar por éxito con datos', async () => {
    stubFetch(async () => new Response(null, { status: 204 }));

    const result = await request('/api/alerts/1/read', { method: 'POST' });

    // Sin cuerpo no hay JSON que devolver: cae en parseo, que es honesto. Lo que no puede
    // pasar es que lance.
    expect(result.ok).toBe(false);
  });
});

describe('requestJson', () => {
  test('manda Content-Type y serializa el cuerpo', async () => {
    const calls = stubFetch(async () => Response.json({ id: '1' }));

    await requestJson('/api/reports/1/narrative', 'POST', { narrative: 'texto' });

    expect(calls[0]?.init?.method).toBe('POST');
    expect((calls[0]?.init?.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json',
    );
    expect(calls[0]?.init?.body).toBe(JSON.stringify({ narrative: 'texto' }));
  });

  test('sin cuerpo no manda `body: undefined`', async () => {
    const calls = stubFetch(async () => Response.json({}));

    await requestJson('/api/documents/1/revert', 'POST');

    expect('body' in (calls[0]?.init ?? {})).toBe(false);
  });
});

describe('errorMessage', () => {
  test('extrae el `error` de texto que preservan las rutas BFF', () => {
    expect(errorMessage({ kind: 'http', status: 409, body: { error: 'ya revertido' } })).toBe(
      'ya revertido',
    );
  });

  /** Sin esto la UI terminaba imprimiendo `[object Object]` o un string vacío. */
  test.each([
    ['sin cuerpo', { kind: 'http' as const, status: 500 }],
    ['cuerpo sin `error`', { kind: 'http' as const, status: 500, body: { detail: 'x' } }],
    ['`error` no string', { kind: 'http' as const, status: 500, body: { error: { a: 1 } } }],
    ['`error` vacío', { kind: 'http' as const, status: 500, body: { error: '   ' } }],
    ['fallo de red', { kind: 'network' as const }],
  ])('devuelve undefined con %s para que el llamador use su texto traducido', (_, error) => {
    expect(errorMessage(error)).toBeUndefined();
  });
});
