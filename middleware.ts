import { authkitProxy } from '@workos-inc/authkit-nextjs';

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
export default authkitProxy({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ['/', '/login', '/callback', '/invitations/accept'],
  },
});

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
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|monitoring|brand|landing).*)'],
};
