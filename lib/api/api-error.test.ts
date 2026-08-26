import { describe, expect, test } from 'bun:test';
import { ApiError, classifyApiFailure } from './api-error';

/**
 * CU-868kkgb8f criterio 5: "el backend dijo que no" no es lo mismo que "el backend no
 * contestó".
 *
 * La diferencia no es cosmética: decide si la pantalla ofrece reintentar. Ante un 5xx o
 * una caída de Railway reintentar arregla; ante un 403 devuelve el mismo 403, y ofrecerlo
 * hace que el producto parezca roto cuando en realidad está respondiendo de forma
 * correcta.
 */
describe('classifyApiFailure', () => {
  test.each([403, 404])('%i es una respuesta: el backend contestó que no', (status) => {
    expect(classifyApiFailure(new ApiError(status, 'GET /x -> ' + status))).toBe('denied');
  });

  test.each([500, 502, 503, 504])('%i es el backend fallando: reintentar sirve', (status) => {
    expect(classifyApiFailure(new ApiError(status, 'GET /x -> ' + status))).toBe('unavailable');
  });

  /**
   * El caso que motiva el ticket: si macha-backend no contesta, `fetch` rechaza con un
   * `TypeError` y nunca se llega a construir un `ApiError`. Tiene que caer en
   * `unavailable`, que es exactamente lo que pasó.
   */
  test('un fetch que rechaza (backend caído) no es ApiError y cae en unavailable', () => {
    expect(classifyApiFailure(new TypeError('fetch failed'))).toBe('unavailable');
  });

  test.each([
    ['undefined', undefined],
    ['null', null],
    ['un string', 'boom'],
    ['un objeto suelto', { status: 403 }],
  ])('%s no se confunde con un 403', (_, value) => {
    // Un objeto con `status: 403` que no sea `ApiError` no cuenta: el status tiene que
    // venir de una respuesta real, no de algo que se le parezca.
    expect(classifyApiFailure(value)).toBe('unavailable');
  });

  /**
   * Este test decía `toBe('unavailable')`, y su propio nombre explicaba por qué eso estaba mal:
   * *"la sesión venció y la salida es volver a entrar"*. Documentaba una LIMITACIÓN —no había
   * un tercer valor que dijera eso— y no un requisito.
   *
   * La limitación tuvo costo medible: `unavailable` se pinta como "El servicio no está
   * respondiendo", así que un 401 le decía al usuario que el backend estaba caído. El
   * 2026-08-26 eso mandó a buscar una caída de WorkOS durante cerca de una hora mientras el
   * problema real era el pool de Postgres agotado. El mensaje que el usuario ve es la primera
   * pista de quien va a depurar.
   */
  test('401 es `expired`: la sesión venció, y ni reintentar ni un aviso de permisos aplican', () => {
    expect(classifyApiFailure(new ApiError(401, 'GET /x -> 401'))).toBe('expired');
  });

  test('un 5xx sí es `unavailable`: ahí el servicio de verdad no respondió', () => {
    for (const status of [500, 502, 503, 504]) {
      expect(classifyApiFailure(new ApiError(status, `GET /x -> ${status}`))).toBe('unavailable');
    }
  });

  /**
   * La separación tiene que ser total: si dos causas con acciones distintas comparten
   * etiqueta, la pantalla ofrece el botón equivocado. Reintentar no arregla un 401 ni un 403.
   */
  test('los tres casos son distintos entre sí', () => {
    const kinds = [401, 403, 503].map((s) => classifyApiFailure(new ApiError(s, 'x')));
    expect(new Set(kinds).size).toBe(3);
  });
});

describe('ApiError', () => {
  test('conserva el status y el mensaje', () => {
    const error = new ApiError(409, 'POST /documents/1/revert -> 409');

    expect(error.status).toBe(409);
    expect(error.message).toBe('POST /documents/1/revert -> 409');
    expect(error).toBeInstanceOf(Error);
  });
});
