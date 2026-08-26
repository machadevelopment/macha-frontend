/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * EL ORIGEN CANÓNICO DE LA APP, DEDUCIDO DE LO QUE WORKOS YA TIENE REGISTRADO
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Este proyecto de Vercel responde por CUATRO dominios (`macha.finance`,
 * `macha-finance.vercel.app`, `macha-finance-macha6.vercel.app` y el de la rama), y no hay
 * ninguno marcado como canónico con los demás redirigiendo a él. Eso ya causó dos bugs, y son
 * la misma clase por los dos lados del flujo de sesión:
 *
 *   · ENTRAR — el `redirect_uri` es un valor fijo, así que el login solo funciona entrando por
 *     el dominio que ese valor nombra. Está documentado en CLAUDE.md.
 *   · SALIR — reportado por Jose el 2026-08-26: *"cuando le doy logout a la plataforma, me
 *     vuelve a mandar al URL de Vercel"*. Captura confirmada: la barra dice
 *     `macha-finance.vercel.app`.
 *
 * ═══ POR QUÉ EL LOGOUT TERMINABA EN VERCEL ═══
 *
 * `signOut({ returnTo: '/' })` pasaba una ruta RELATIVA, y el SDK de WorkOS la mete tal cual en
 * el query del endpoint de logout (verificado en `@workos-inc/node`):
 *
 *     url.searchParams.set("return_to", returnTo)   // return_to=%2F
 *
 * WorkOS no puede redirigir a una ruta relativa —no sabe de qué host— así que cae a la URI
 * configurada en SU dashboard, que es la de Vercel. El síntoma aparece lejos de la causa: nada
 * en este repo dice "vercel.app", y aun así ahí es donde el usuario aterriza.
 *
 * ═══ POR QUÉ SE DEDUCE DEL `redirect_uri` Y NO SE AGREGA UNA VARIABLE ═══
 *
 * `NEXT_PUBLIC_WORKOS_REDIRECT_URI` ya existe, ya apunta al dominio canónico y —esto es lo que
 * importa— **ya está registrada en WorkOS**. Una variable nueva sería un segundo lugar donde
 * escribir el mismo dominio, y el día que se mueva uno sin el otro el login y el logout
 * apuntarían a hosts distintos: exactamente el bug que esto viene a cerrar.
 *
 * ⚠️ LA MITAD QUE EL CÓDIGO NO PUEDE ARREGLAR. Los redirects de WorkOS son de DASHBOARD, no de
 * API. Si WorkOS valida `return_to` contra su lista y `https://macha.finance/` no está ahí,
 * volverá a caer a su default y el síntoma seguirá — con la causa ya movida de sitio. La
 * verificación es mirar la barra después de cerrar sesión; si sigue en Vercel, lo que falta es
 * esa entrada en el dashboard, no otro cambio acá.
 */

/** Fallback: el dominio de producción. Solo se usa si la variable falta o viene mal formada. */
const CANONICO = 'https://macha.finance';

/**
 * El origen (`https://host`) por el que la app se identifica ante WorkOS.
 *
 * Nunca lanza: un logout que explota por una variable mal puesta deja al usuario con la sesión
 * a medio cerrar, que es peor que redirigirlo al dominio de producción. Si la variable falta,
 * se usa el canónico y se avisa en el log del servidor.
 */
export function origenCanonico(): string {
  const raw = process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI;
  if (!raw) {
    console.warn(
      '[auth] NEXT_PUBLIC_WORKOS_REDIRECT_URI no está definida: el origen canónico cae a ' +
        `${CANONICO}. El login tampoco puede estar funcionando sin ella.`,
    );
    return CANONICO;
  }
  try {
    return new URL(raw).origin;
  } catch {
    console.warn(
      `[auth] NEXT_PUBLIC_WORKOS_REDIRECT_URI no es una URL válida ("${raw}"): el origen ` +
        `canónico cae a ${CANONICO}.`,
    );
    return CANONICO;
  }
}

/**
 * Una URL ABSOLUTA sobre el dominio canónico, para los destinos que salen de la app y vuelven.
 *
 * `path` se resuelve contra el origen, así que tanto `/` como `settings` funcionan.
 */
export function urlCanonica(path = '/'): string {
  return new URL(path, `${origenCanonico()}/`).toString();
}
