import { describe, expect, test, mock } from 'bun:test';

mock.module('server-only', () => ({}));
const { leerCuerpo } = await import('@/lib/api/json-o-texto');

/**
 * El 500 que esto arregla: el backend respondió `403 Not a member of the requested company`
 * en TEXTO PLANO (los guards de Elysia lanzan `throw new Error`, y el `onError` de `app.ts`
 * deja que Elysia serialice el mensaje a secas), y el `await res.json()` del proxy explotó
 * con `SyntaxError: Unexpected token 'N'`.
 *
 * El usuario vio un 500 sin información donde el backend había devuelto un 403 explicado.
 */
describe('leerCuerpo', () => {
  const respuesta = (cuerpo: string, status = 200) => new Response(cuerpo, { status });

  test('devuelve el JSON cuando el cuerpo es JSON', async () => {
    expect(await leerCuerpo(respuesta('{"id":"abc","rows":2}'))).toEqual({ id: 'abc', rows: 2 });
  });

  test('EL CASO DEL FALLO: texto plano se envuelve en `{error}` en vez de explotar', async () => {
    const cuerpo = await leerCuerpo(respuesta('Not a member of the requested company', 403));
    expect(cuerpo).toEqual({ error: 'Not a member of the requested company' });
  });

  test('un cuerpo vacío no lanza', async () => {
    // 204, o un error sin cuerpo: `JSON.parse('')` también lanza SyntaxError.
    expect(await leerCuerpo(respuesta('', 204))).toEqual({});
  });

  test('un JSON de error del backend se conserva tal cual', async () => {
    // Los rechazos de capacidad (413/402/429/415) traen un `{error}` localizado que la
    // pantalla de carga muestra literal — no se puede perder ni reescribir.
    expect(await leerCuerpo(respuesta('{"error":"El archivo supera los 10 MB"}', 413))).toEqual({
      error: 'El archivo supera los 10 MB',
    });
  });

  test('HTML de un proxy intermedio tampoco rompe', async () => {
    const cuerpo = (await leerCuerpo(
      respuesta('<html><body>502 Bad Gateway</body></html>', 502),
    )) as { error: string };
    expect(cuerpo.error).toContain('502');
  });
});
