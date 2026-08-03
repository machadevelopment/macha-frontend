import { authkitProxy } from '@workos-inc/authkit-nextjs';

// CU-868kfva59: sesión requerida en todo excepto la hosted UI de login (`/`) y el
// callback de intercambio código→sesión. authkitProxy solo exige sesión — el rol
// (staff/company role) se resuelve server-side en macha-backend, no aquí.
export default authkitProxy({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ['/', '/callback'],
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
