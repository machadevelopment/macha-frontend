import { redirect } from 'next/navigation';
import { getSignInUrl } from '@workos-inc/authkit-nextjs';

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
 * mundo— devolvía 500. No se detectó antes porque sin WorkOS configurado el middleware
 * fallaba primero y nunca se llegaba a ejecutar la página.
 *
 * `redirect()` funciona lanzando una excepción que Next captura; no hay nada después.
 */
export async function GET() {
  redirect(await getSignInUrl());
}
