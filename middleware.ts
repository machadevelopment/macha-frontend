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
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|monitoring).*)'],
};
