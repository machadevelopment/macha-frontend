import { redirect } from 'next/navigation';
import { getSignInUrl, getSignUpUrl } from '@workos-inc/authkit-nextjs';
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
 * sobre su `returnPathname` por defecto. Por eso el default de `destinoSeguro` es
 * `/continue` y no `/`: si acá se pasara la raíz, el usuario autenticado aterrizaría en
 * la landing y el `returnPathname: '/continue'` del callback no llegaría a aplicarse.
 *
 * CU-868ktkq8r: `?screenHint=sign-up` abre la hosted UI en CREAR CUENTA en vez de en
 * entrar. Lo usa la pantalla de invitación, y no es un detalle estético: el invitado que
 * llega de un correo casi nunca tiene cuenta todavía, y `getSignInUrl` lo deja frente a
 * un formulario de "entrar" en el que no puede entrar, con el enlace de registro en letra
 * pequeña. Es un `hint` y no una imposición — las dos pantallas de WorkOS se enlazan entre
 * sí—, así que el usuario que sí tenía cuenta no queda atrapado.
 */
export async function GET(request: NextRequest) {
  const returnTo = destinoSeguro(request.nextUrl.searchParams.get('returnTo'));
  const quiereRegistrarse = request.nextUrl.searchParams.get('screenHint') === 'sign-up';
  redirect(await (quiereRegistrarse ? getSignUpUrl({ returnTo }) : getSignInUrl({ returnTo })));
}
