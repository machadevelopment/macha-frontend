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

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
