import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';
import { authkitProxy } from '@workos-inc/authkit-nextjs';
import { destinoCanonico } from '@/lib/auth/canonical-origin';

// CU-868kfva59: sesión requerida en todo excepto la hosted UI de login (`/`) y el
// callback de intercambio código→sesión. authkitProxy solo exige sesión — el rol
// (staff/company role) se resuelve server-side en macha-backend, no aquí.
//
// `/login` es la tercera pública y tiene que serlo: es el Route Handler que arma la URL
// de la hosted UI y escribe la cookie PKCE (app/login/route.ts). Exigirle sesión a la
// puerta de entrada dejaría a quien no ha entrado sin forma de entrar.
//
// CU-868ktkq8r — `/invitations/accept` es la CUARTA, y es un cambio de criterio.
// Exigirle sesión se había decidido a propósito: el enlace del correo llevaba a AuthKit
// primero y volvía con el `?token=` intacto. Eso sirve para quien ya tiene cuenta y
// falla justo para el caso normal de esa ruta, el invitado NUEVO: clic en el correo y,
// sin una palabra de explicación, la pantalla genérica de "Sign up" de WorkOS pidiendo
// nombre y apellido. Es la captura del ticket. La ruta ahora explica que hay una
// invitación a una empresa que ya existe ANTES de mandar a nadie a autenticarse, y ella
// misma manda a `/login?returnTo=…` conservando el token. El middleware no protege nada
// al exigir sesión aquí: la aceptación la sigue exigiendo el BFF y el backend.
const proxy = authkitProxy({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ['/', '/login', '/callback', '/invitations/accept'],
  },
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * EL DOMINIO CANÓNICO SE FUERZA ANTES QUE NADA (2026-08-26)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Va ANTES de `proxy` y no después, y ese orden es el punto entero: si AuthKit corre primero,
 * a quien llega sin sesión al dominio de Vercel ya le respondió un 307 hacia WorkOS con el
 * `redirect_uri` de `macha.finance`, y para cuando el usuario vuelve, la sesión quedó escrita
 * en un dominio distinto del que está mirando. Redirigir después de eso no arregla nada.
 *
 * El motivo completo —y por qué arreglar `signOut` no bastaba— está en `destinoCanonico`.
 *
 * ⚠️ Esto NO alcanza a lo que el `matcher` excluye (`brand/`, `icon.svg`, `landing/`,
 * `api/public/`, `monitoring`): ahí el middleware ni corre. Es lo correcto y no un descuido —
 * son estáticos y endpoints públicos que se sirven igual de bien por cualquier host, y el
 * único que viaja en una URL absoluta hacia afuera es `brand/`, que los correos ya escriben
 * contra el dominio canónico.
 */
export default function middleware(request: NextRequest, event: NextFetchEvent) {
  /*
   * El host sale de la CABECERA y no de `request.url`: en el runtime de middleware esa
   * propiedad no siempre refleja el `Host` con el que entró la petición, y equivocarse acá
   * significa redirigir a `macha.finance` a alguien que ya está en `macha.finance` — un bucle
   * infinito en la puerta del producto.
   */
  const destino = destinoCanonico(
    request.headers.get('host'),
    request.nextUrl.pathname,
    request.nextUrl.search,
  );
  if (destino) return NextResponse.redirect(destino, 307);

  return proxy(request, event);
}

// CU-868kjc99f: `/monitoring` queda FUERA del matcher. Es el `tunnelRoute` de Sentry
// (next.config.mjs) — un proxy de ingesta hacia sentry.io, no una pantalla de la app.
// Dentro del matcher, `authkitProxy` le exigiría sesión: los errores de `/`, la única
// ruta pública y justo donde falla quien todavía no pudo entrar, se responderían con un
// redirect al login en vez de reportarse. Excluirlo del matcher es más seguro que
// sumarlo a `unauthenticatedPaths`: así el middleware ni siquiera corre sobre el túnel.
// `brand/` también queda FUERA del matcher, y por un motivo distinto al de `/monitoring`:
// sus archivos los pide un CLIENTE DE CORREO, no un navegador con sesión.
//
// El logo de los correos transaccionales se sirve desde acá (`/brand/isotipo.png`). Dentro
// del matcher, `authkitProxy` respondería 307 hacia WorkOS a quien lo pida — y Gmail, que no
// sigue redirecciones para cargar una imagen, la pinta rota. Es exactamente el síntoma que
// reportó Jose.
//
// Sumarlo a `unauthenticatedPaths` no alcanzaría igual de bien: eso lo deja pasar por el
// middleware para que este decida no exigir sesión. Excluirlo del matcher es que el
// middleware ni siquiera corra sobre un archivo estático, que es lo correcto.
//
// ═══ `icon.svg` (2026-08-21): EL FAVICON ESTABA ROTO POR ESTA MISMA LÍNEA ═══
//
// La lista excluía `favicon.ico` —que este proyecto NO tiene— y no `icon.svg`, que es el
// archivo real: el App Router sirve `app/icon.svg` en `/icon.svg` y emite su `<link rel=icon>`
// solo. O sea que el navegador pedía el ícono y recibía un **307 hacia api.workos.com**
// (verificado en producción), y la pestaña se quedaba con el genérico.
//
// Vale decir cómo pasó desapercibido: al arreglar el logo de los correos usé `/icon.svg` como
// EVIDENCIA de que este matcher redirige lo que no excluye. La prueba era correcta y era, al
// mismo tiempo, un defecto activo que nadie estaba mirando.
//
// `favicon.ico` se queda en la lista aunque hoy no exista: si algún día se agrega uno, tiene
// que estar excluido por el mismo motivo, y quitarlo ahora solo dejaría la trampa armada.
//
// ═══ `landing/` (2026-08-21): LOS MOCKUPS DE LA PORTADA, MISMO AGUJERO ═══
//
// Los PNG del hero y del producto viven en `public/landing/` y se piden como
// `/landing/mockup-*.png`. Dentro del matcher, `authkitProxy` responde 307 a WorkOS; el
// navegador (y el optimizador de `next/image` cuando va a buscar el origen) recibe HTML de
// login en vez del PNG y pinta el ícono roto con el `alt` a la vista. Keneth lo reportó
// desde producción: "osea las imágenes aparecen así".
//
// Es el mismo defecto que `brand/` e `icon.svg`. Queda fuera del matcher, no en
// `unauthenticatedPaths`, por la misma razón: un estático no tiene por qué pasar por AuthKit.
//
// ═══ `api/public/` (2026-08-24): EL FORMULARIO DE DEMO, Y EL PEOR DE LOS CUATRO ═══
//
// Cuarta vez que muerde el mismo agujero, y la primera sobre algo que no es un estático.
// `POST /api/public/demo-requests` es el BFF del formulario de la landing — el ÚNICO camino
// de conversión del producto. Dentro del matcher, `authkitProxy` le exigía sesión al único
// endpoint que por diseño no puede tenerla: quien pide una demo todavía no es cliente.
//
// Lo que hace que este haya sobrevivido a varias pruebas del equipo es que NO falla para
// todos. `session.js` redirige solo `if (middlewareAuth.enabled && matchedPaths.length === 0
// && !session.user)`: con sesión el proxy deja pasar y el envío funciona. O sea que a
// cualquiera del equipo, con su sesión abierta, el formulario le andaba — y fallaba
// exactamente para el visitante sin sesión, que es el 100% de los leads reales. El reporte
// que lo destapó fue "a algunos les funciona y a otros no".
//
// Verificado en producción antes del arreglo: `POST /api/public/demo-requests` sin cookies
// devolvía **303 hacia api.workos.com**. El `fetch` del navegador sigue la redirección, se
// topa con CORS contra WorkOS y el formulario pinta "No pudimos enviar la solicitud" — un
// mensaje que culpa al backend por una petición que nunca salió de Vercel.
//
// Se excluye el NAMESPACE `api/public/` y no la ruta suelta, a propósito: es el mismo
// prefijo que usa macha-backend para marcar lo que está abierto (`/public/demo-requests`),
// así que cualquier BFF público futuro nace destapado por construcción en vez de repetir
// este ticket. Y fuera del matcher —no en `unauthenticatedPaths`— porque el middleware no
// tiene nada que decidir sobre una ruta que ya declaró que no lleva sesión.
//
// La barra final NO es cosmética: sin ella el lookahead también tapaba `/api/publicidad`
// o cualquier ruta futura cuyo nombre EMPIECE con "public", dejándola sin sesión por un
// choque de prefijos que nadie iría a buscar acá.
//
// ⚠️ El corolario: todo lo que cuelgue de `app/api/public/` queda SIN sesión. Ese es el
// contrato del directorio, y `bff-contract.test.ts` (`RUTAS_PUBLICAS`) exige justificar por
// escrito cada ruta que entra ahí.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|monitoring|brand|landing|api/public/).*)',
  ],
};
