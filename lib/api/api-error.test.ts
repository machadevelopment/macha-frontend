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

  test('401 no es `denied`: la sesión venció y la salida es volver a entrar, no un aviso de permisos', () => {
    expect(classifyApiFailure(new ApiError(401, 'GET /x -> 401'))).toBe('unavailable');
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
