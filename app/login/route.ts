import { redirect } from 'next/navigation';
import { getSignInUrl } from '@workos-inc/authkit-nextjs';
import type { NextRequest } from 'next/server';
import { destinoSeguro } from '@/lib/auth/return-to';

/**
 * Entrada a la hosted UI de WorkOS. Existe como Route Handler y no como un `href`
 * calculado en `/` por una razón concreta: `getSignInUrl()` no es una función pura que
 * devuelve una URL — internamente llama a `getAuthURLAndSetPKCECookie`, que **escribe
 * una cookie** con el `code_verifier` del intercambio PKCE. Next.js solo permite mutar
 * cookies en Server Actions y Route Handlers, así que llamarla desde el cuerpo de
 * `app/page.tsx` (un Server Component) lanzaba en tiempo de ejecución:
 *
 *   Error: Cookies can only be modified in a Server Action or Route Handler
 *
 * y `/` —la ÚNICA ruta pública del producto, y la puerta de entrada de todo el
 * mundo— devolvía 500.
 *
 * `redirect()` funciona lanzando una excepción que Next captura; no hay nada después.
 *
 * CU-868kt4bxc: `?returnTo` hace que el login VUELVA a donde el usuario quería ir — hoy,
 * el reporte que le llegó por correo. La validación de ese parámetro y el porqué viven en
 * `lib/auth/return-to.ts`, que sí se puede probar (un `route.ts` no puede exportar nada
 * más que métodos HTTP).
 *
 * El SDK lo expone como `returnTo` y lo guarda en la cookie PKCE; el callback lo prefiere
 * sobre su `returnPathname` por defecto.
 */
export async function GET(request: NextRequest) {
  const returnTo = destinoSeguro(request.nextUrl.searchParams.get('returnTo'));
  redirect(await getSignInUrl({ returnTo }));
}
