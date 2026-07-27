import 'server-only';
import { withAuth } from '@workos-inc/authkit-nextjs';

/**
 * Sesión actual, exigiendo login (redirige a la hosted UI si no hay sesión —
 * comportamiento de `withAuth({ ensureSignedIn: true })`, ver
 * node_modules/@workos-inc/authkit-nextjs/src/session.ts). Solo para Server
 * Components/Route Handlers dentro de rutas ya protegidas por middleware.ts.
 */
export async function requireSession() {
  const { user, accessToken } = await withAuth({ ensureSignedIn: true });
  return { user, accessToken };
}

/** Sesión opcional — no redirige; `user` es `null` si no hay sesión. */
export async function getOptionalSession() {
  return withAuth();
}
