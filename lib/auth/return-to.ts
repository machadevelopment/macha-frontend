/**
 * Valida el destino al que se vuelve después del login — CU-868kt4bxc.
 *
 * ═══ POR QUÉ EXISTE ═══
 *
 * Macha reportó que el enlace del correo de reporte "lleva a la plataforma y no al
 * reporte". El enlace SÍ era el correcto —`/reports/:id`, lo arma `reportUrl()` en el
 * backend—; lo que se perdía era el destino durante el login:
 *
 *   1. el correo lleva a `/reports/abc`;
 *   2. el middleware ve que no hay sesión y manda a la hosted UI de WorkOS;
 *   3. al volver, el callback aterrizaba en la raíz y el reporte se perdía.
 *
 * `handleAuth` **ya sabe volver al destino**: prefiere el `returnPathname` que viaja en la
 * cookie PKCE sobre su opción por defecto (verificado en `authkit-callback-route.js`). Lo
 * que faltaba era que alguien lo pusiera ahí, y ese alguien es `app/login/route.ts`, que
 * es quien crea esa cookie.
 *
 * ═══ POR QUÉ EL DEFAULT YA NO ES `/` (2026-08-21) ═══
 *
 * Cuando `/` era portada Y enrutador post-login, devolver `'/'` estaba bien. Ahora `/` es
 * la landing pública: si `getSignInUrl({ returnTo: '/' })` mete eso en la cookie PKCE, el
 * callback **prefiere** ese valor sobre `handleAuth({ returnPathname: '/continue' })` y el
 * usuario se autentica bien, aterriza en marketing y no pasa nada visible. Keneth lo
 * reportó: "Haciendo /login, luego de poner password y todo te regresa a la landing".
 *
 * `/continue` es la bifurcación (dashboard / invitación / registro). También se trata `'/'`
 * explícito como ese destino: volver a la portada después de autenticarse nunca es lo que
 * alguien quiere.
 *
 * ═══ POR QUÉ SE VALIDA, Y POR QUÉ VIVE APARTE ═══
 *
 * `?returnTo` viene de la URL, o sea del usuario o de quien le mande un enlace. Sin
 * validar, `/login?returnTo=https://sitio-malo/` convierte la puerta de entrada del
 * producto en un **redirector abierto**: alguien manda ese enlace, la víctima ve el
 * dominio de Macha y la hosted UI real de WorkOS, y termina en otro sitio ya logueada y
 * confiada. Es de los pocos agujeros que se explotan sin tocar el servidor.
 *
 * Vive en su propio módulo y no dentro del Route Handler por dos razones: Next.js prohíbe
 * que un `route.ts` exporte cualquier cosa que no sea un método HTTP —así que ahí no se
 * puede probar—, y una regla de seguridad sin test es una regla que alguien "simplifica"
 * el día que le estorbe.
 */

/** Destino post-login cuando no hay `returnTo` válido. `/` es la landing; acá no. */
export const DESPUES_DEL_LOGIN = '/continue';

export function destinoSeguro(returnTo: string | null | undefined): string {
  // Sin parámetro, o la raíz (que ahora es marketing): a la bifurcación de sesión.
  if (!returnTo || returnTo === '/') return DESPUES_DEL_LOGIN;

  // Tiene que ser una ruta relativa a la raíz. `//evil.com` NO lo es: el navegador la lee
  // como URL absoluta con el protocolo actual, y es el caso exacto que abre el redirector.
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) return DESPUES_DEL_LOGIN;

  // `\\` porque varios navegadores lo normalizan a `/`: `/\\evil.com` acabaría fuera del
  // sitio aunque empiece por una sola barra.
  if (returnTo.includes('\\')) return DESPUES_DEL_LOGIN;

  // Espacios y caracteres de control no llevan a ningún destino legítimo, y son la vía
  // clásica para colar un salto de línea en una cabecera.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0020\u007f]/.test(returnTo)) return DESPUES_DEL_LOGIN;

  return returnTo;
}
