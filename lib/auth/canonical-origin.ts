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

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * EL REDIRECT QUE CIERRA LA CLASE ENTERA DE BUGS DE DOMINIO
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Devuelve la URL a la que hay que mandar esta petición para que quede en el dominio canónico,
 * o `null` si ya está donde debe.
 *
 * ═══ QUÉ PROBLEMA RESUELVE, Y POR QUÉ NO BASTABA ARREGLAR EL LOGOUT ═══
 *
 * Cuatro dominios responden por este proyecto de Vercel y ninguno era canónico. El
 * `redirect_uri` que se le manda a WorkOS es un valor FIJO, no derivado del host, así que
 * entrar por cualquiera de los otros tres deja la sesión escrita en `macha.finance` y al
 * usuario mirando un dominio donde no la tiene. Lo mismo por el otro lado: WorkOS decide a
 * dónde devolver tras cerrar sesión, y si su lista no acepta lo que le mandamos, cae a SU
 * default — que es el de Vercel.
 *
 * Ese último paso es el que ningún cambio en este repo puede controlar: los redirects de
 * WorkOS son de dashboard, no de API. Por eso arreglar `signOut` para que mande una URL
 * absoluta era necesario pero no suficiente — seguía dependiendo de una lista que no vemos.
 *
 * Con esto, no importa: aunque WorkOS mande a alguien al dominio de Vercel, la petición se
 * redirige al canónico antes de que el proxy de AuthKit siquiera corra. El síntoma que Jose
 * reportó tres veces (*"me vuelve a mandar al URL de Vercel"*) deja de ser alcanzable.
 *
 * ═══ SOLO EN PRODUCCIÓN, Y ESO PROTEGE LAS PREVIEWS ═══
 *
 * `VERCEL_ENV` vale `production` únicamente en el despliegue de producción — que es el que
 * sirve los tres alias a la vez (`macha.finance`, `macha-finance.vercel.app` y el de la rama
 * `main`). Una preview de PR vale `preview`, y en local no existe.
 *
 * Sin esa condición, cada preview se redirigiría a producción y **la revisión por PR dejaría
 * de existir**: el revisor abriría el enlace de Vercel y aterrizaría en el producto en vivo,
 * viendo el código viejo y creyendo que vio el nuevo. Eso es peor que el bug que esto arregla.
 *
 * ═══ 307 Y NO 308, A PROPÓSITO ═══
 *
 * Un 308 es permanente y los navegadores lo cachean sin fecha de vencimiento. El dominio de
 * este destino sale de una variable de entorno que YA se movió una vez y dejó el login caído
 * un día entero; si vuelve a moverse, un 308 cacheado seguiría mandando a la gente al dominio
 * viejo sin forma de limpiarlo de sus máquinas. El 307 preserva el método igual y no se
 * cachea.
 */
export function destinoCanonico(host: string | null, pathname: string, search = ''): string | null {
  if (process.env.VERCEL_ENV !== 'production') return null;
  if (!host) return null;

  const canonico = new URL(origenCanonico());
  // Comparación insensible a mayúsculas: el `Host` lo escribe el cliente y `MACHA.finance`
  // es el mismo servidor. Sin esto, un host en mayúsculas se redirigiría a sí mismo en bucle.
  if (host.toLowerCase() === canonico.host.toLowerCase()) return null;

  /*
   * ⚠️ EL DESTINO SE ARMA POR ASIGNACIÓN, NUNCA RESOLVIENDO LA RUTA CONTRA LA BASE.
   *
   * `new URL('//evil.com/x', 'https://macha.finance')` devuelve `https://evil.com/x`: una ruta
   * que empieza con dos barras es relativa al PROTOCOLO, no al host, así que se lleva el
   * dominio consigo. Y `pathname` viene de la petición, o sea del atacante — un enlace a
   * `macha-finance.vercel.app//evil.com` habría convertido a este middleware en un redirector
   * abierto, con el producto despachando al usuario a otro sitio con su propio 307.
   *
   * El setter de `pathname` solo toca el componente de ruta y no puede mover el host
   * (comprobado: queda `https://macha.finance//evil.com/x`). Hay test de los tres casos.
   */
  const destino = new URL(canonico.origin);
  destino.pathname = pathname;
  destino.search = search;
  return destino.toString();
}
