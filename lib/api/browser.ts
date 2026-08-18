/**
 * CU-868kkgb3c: fetch del NAVEGADOR hacia las rutas BFF (`/api/*`).
 *
 * No lleva `import 'server-only'` a propósito — es justo lo contrario de
 * `lib/api/client.ts`, que es el fetch del servidor hacia macha-backend. Aquí no viaja
 * ningún token: la ruta BFF lo adjunta server-side.
 *
 * ## Por qué existe
 *
 * La auditoría de 2026-08-03 encontró 41 de 44 llamadas del cliente escritas así:
 *
 * ```ts
 * fetch('/api/loquesea').then((r) => r.json()).then(setData);
 * ...
 * if (!data) return null;   // ← el mismo `null` para "cargando" y para "se rompió"
 * ```
 *
 * Dos fallos distintos con la misma consecuencia:
 *
 *   - **non-2xx**: `r.json()` corre igual sobre el cuerpo del error. Si ese cuerpo es
 *     HTML (un 502 de proxy, la página de error de Vercel), `json()` lanza dentro de un
 *     `.then()` sin `.catch()` → unhandled rejection y `setData` nunca ocurre.
 *   - **fallo de red**: `fetch` rechaza, mismo final.
 *
 * Como el estado inicial y el de error eran ambos `null`, la pantalla quedaba en blanco
 * para siempre, indistinguible de "todavía no tienes datos".
 *
 * ## El contrato
 *
 * `request` **nunca lanza y nunca rechaza**. Devuelve un resultado discriminado, así que
 * el compilador obliga a mirar el caso de error antes de tocar `data` — que es la parte
 * que no se puede conseguir con un `try/catch` que alguien tiene que acordarse de poner.
 */

/** Motivo del fallo. La UI decide el mensaje; acá solo se clasifica. */
export type RequestErrorKind =
  /** No hubo respuesta: DNS, offline, CORS, timeout del navegador. Reintentar sirve. */
  | 'network'
  /** Hubo respuesta pero con status de error. `status` dice cuál. */
  | 'http'
  /** Respondió 2xx pero el cuerpo no era JSON válido. Casi siempre un proxy metiéndose. */
  | 'parse';

export interface RequestError {
  kind: RequestErrorKind;
  /** Presente solo en `kind: 'http'`. */
  status?: number;
  /**
   * `error` que la ruta BFF haya puesto en el cuerpo, si lo había y era JSON. Varias
   * rutas (`/api/insights`, `/api/documents`, `/api/credits-topup`) conservan a propósito
   * el cuerpo del backend porque trae datos que la UI necesita mostrar; tirarlo acá
   * anularía ese trabajo.
   */
  body?: unknown;
}

export type RequestResult<T> = { ok: true; data: T } | { ok: false; error: RequestError };

/**
 * Hace la petición y clasifica el resultado. Nunca lanza.
 *
 * El cuerpo de un error se intenta parsear como JSON, pero su fallo **no** cambia el
 * diagnóstico: si el status ya era 500, que además el cuerpo no sea JSON no lo hace un
 * error de parseo, lo deja en 500 con `body: undefined`.
 */
export async function request<T>(input: string, init?: RequestInit): Promise<RequestResult<T>> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    // `fetch` solo rechaza cuando no hubo respuesta. Un 500 es una respuesta.
    return { ok: false, error: { kind: 'network' } };
  }

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      // Cuerpo no-JSON (HTML de proxy, vacío). No aporta, pero tampoco cambia nada.
    }
    return { ok: false, error: { kind: 'http', status: res.status, body } };
  }

  try {
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, error: { kind: 'parse' } };
  }
}

/**
 * Azúcar para las mutaciones con cuerpo JSON, que en el repo se escribían a mano y con
 * el `Content-Type` puesto de forma despareja (varios `POST` lo omitían).
 */
export function requestJson<T>(
  input: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: unknown,
  /**
   * CU-868ktmdex: para poder dejar de esperar una respuesta en curso.
   *
   * Va como cuarto parámetro opcional y no dentro de `body` porque no es dato de la
   * petición, es control de su ciclo de vida. Un `AbortController` que se dispara hace que
   * `fetch` rechace, y `request` ya trata cualquier rechazo como `kind: 'network'` — quien
   * llame tiene que distinguir el aborto por su cuenta (`signal.aborted`), porque para el
   * usuario "lo detuve yo" y "se cayó la red" no son el mismo suceso ni merecen el mismo
   * mensaje.
   */
  signal?: AbortSignal,
): Promise<RequestResult<T>> {
  return request<T>(input, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...(signal ? { signal } : {}),
  });
}

/**
 * Extrae el `error` de texto que ponen las rutas BFF que preservan el cuerpo del
 * backend (`{ error: string }`). Devuelve `undefined` si no hay uno utilizable, para que
 * quien llame caiga a su mensaje traducido en vez de imprimir un objeto.
 */
export function errorMessage(error: RequestError): string | undefined {
  if (error.body && typeof error.body === 'object' && 'error' in error.body) {
    const value = (error.body as { error: unknown }).error;
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return undefined;
}
