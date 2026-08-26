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
/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * TRES CAUSAS, TRES MENSAJES — ANTES ERAN DOS Y MANDABAN A BUSCAR DONDE NO ERA
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * La versión anterior devolvía `denied` para 403/404 y **`unavailable` para todo lo demás**, y
 * `unavailable` se pinta como *"El servicio no está respondiendo"*. O sea que un 401 —sesión
 * vencida, que se arregla volviendo a entrar— le decía al usuario que el backend estaba caído.
 *
 * No es un detalle de copia: el 2026-08-26 ese mensaje costó cerca de una hora de diagnóstico.
 * La caída real era el pool de Postgres agotado, pero como esta función pinta lo mismo para un
 * 401 que para un 503, el reporte llegó como "el login está roto" y se persiguió a WorkOS
 * mientras el problema estaba en la base. El mensaje que el usuario ve ES la primera pista que
 * recibe quien va a depurar.
 *
 * `expired` es su propio caso porque su ACCIÓN es distinta: reintentar no arregla una sesión
 * vencida, hay que volver a entrar. Ofrecer "Reintentar" ahí es mandar a alguien a apretar un
 * botón que no puede funcionar.
 *
 * Un fallo de red (`fetch` que lanza, sin `ApiError`) sigue cayendo en `unavailable`, que es
 * correcto: ahí de verdad no hubo respuesta.
 */
export function classifyApiFailure(error: unknown): 'unavailable' | 'denied' | 'expired' {
  if (!(error instanceof ApiError)) return 'unavailable';
  if (error.status === 401) return 'expired';
  if (error.status === 403 || error.status === 404) return 'denied';
  return 'unavailable';
}
