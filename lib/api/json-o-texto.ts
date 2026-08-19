import 'server-only';

/**
 * Lee el cuerpo de una respuesta del backend SIN asumir que es JSON.
 *
 * ═══ EL 500 QUE ESTO ARREGLA (producción, 2026-08-19) ═══
 *
 * Las rutas del BFF que necesitan pasar el cuerpo del backend tal cual —porque trae un
 * mensaje para el usuario que no se puede perder— hacían `await res.json()` a secas, sin
 * mirar `res.ok`. Eso funciona mientras el backend conteste JSON.
 *
 * No siempre lo hace. Los guards lanzan `throw new Error('...')` con un `set.status`, y el
 * `onError` de `app.ts` devuelve `undefined` para esos casos, así que Elysia cae a su manejo
 * por defecto: TEXTO PLANO. Cuando `tenant.derive.ts` respondió 403 "Not a member of the
 * requested company", el `res.json()` del proxy explotó con:
 *
 *     SyntaxError: Unexpected token 'N', "Not a memb"... is not valid JSON
 *
 * Y ese SyntaxError es lo que el usuario vio como `500` en la consola. O sea: el backend
 * respondió un 403 perfectamente correcto y explicado, y el proxy lo convirtió en un 500 sin
 * información. El error real quedaba enterrado bajo un stack de `undici`.
 *
 * ═══ QUÉ HACE ═══
 *
 * Devuelve el JSON cuando el cuerpo es JSON, y `{ error: <texto> }` cuando no lo es — que es
 * la forma que el resto del frontend ya sabe mostrar. El status del backend se conserva
 * SIEMPRE, que es lo que convierte un 500 opaco en el 403 que de verdad ocurrió.
 */
export async function leerCuerpo(res: Response): Promise<unknown> {
  const texto = await res.text();
  if (texto === '') return {};

  try {
    return JSON.parse(texto);
  } catch {
    /*
     * No es JSON: casi siempre el `error.message` en texto plano de un guard de Elysia.
     * Se envuelve en `{ error }` para que el cliente lo lea igual que cualquier otro
     * rechazo del backend, en vez de romperse al parsear.
     */
    return { error: texto };
  }
}
