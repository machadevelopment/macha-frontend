/**
 * El error de `apiFetch` y su clasificación, separados de `lib/api/client.ts`.
 *
 * `client.ts` importa `server-only`, que lanza al cargarse fuera de un Server Component
 * —incluido `bun test`—, así que nada de lo que vive ahí se puede probar. Esto es lógica
 * pura sin nada de servidor: una clase de error y una función total. Sacarla acá la vuelve
 * testeable sin aflojar la barrera de `client.ts`, que sigue siendo `server-only` porque
 * `apiFetch` sí maneja el access token.
 *
 * `client.ts` las reexporta, así que los importadores existentes no cambian.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * CU-868kkgb8f criterio 5: separa "el backend dijo que no" de "el backend no contestó".
 *
 * Le importa al usuario porque la acción que le sirve es distinta: ante un 5xx o una
 * caída, reintentar arregla; ante un 403, reintentar da exactamente el mismo 403 y
 * ofrecerlo solo hace parecer que el producto no responde.
 *
 * Se usa del lado del servidor y no dentro de un `error.tsx` a propósito: en producción
 * Next reemplaza el error de un Server Component por uno genérico antes de entregárselo a
 * un boundary de cliente —solo sobrevive `digest`—, así que el status únicamente se conoce
 * donde se lanzó. Un `fetch` que rechaza (backend caído, DNS, timeout) no es `ApiError` y
 * cae en `unavailable`, que es justo lo que es.
 */
export function classifyApiFailure(error: unknown): 'unavailable' | 'denied' {
  return error instanceof ApiError && (error.status === 403 || error.status === 404)
    ? 'denied'
    : 'unavailable';
}
