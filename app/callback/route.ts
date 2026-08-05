import { NextResponse, type NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { handleAuth } from '@workos-inc/authkit-nextjs';

/**
 * CU-868kfva59: intercambio code→sesión de la hosted UI. `returnPathname` por
 * defecto ('/') coincide con el único destino que existe hoy en F1.
 *
 * CU-868kmr0j5 — `onError`. Sin él, TODO login que no termina bien devolvía 500 y una
 * pantalla de error cruda. Verificado contra producción, los tres caminos daban 500:
 * sin parámetros, con `?code=` inválido y con `?error=access_denied` — que es lo que
 * manda WorkOS cuando el usuario CANCELA el acceso.
 *
 * No son casos rebuscados: cae aquí quien cancela, quien tarda hasta que expira el
 * código, y quien perdió la cookie PKCE por cambiar de navegador, usar incógnito o
 * limpiar cookies a medias. El SDK trae un fallback propio, pero responde 500 con un
 * texto en inglés fuera del diseño y sin salida — en una demo es justo lo que se ve.
 *
 * Ahora se redirige a `/` con `?auth_error=1`, que la landing traduce a un mensaje del
 * diccionario junto al botón de entrar, así el usuario puede reintentar en el sitio.
 * El error real va a Sentry: el usuario no necesita el detalle, nosotros sí.
 */
export const GET = handleAuth({
  returnPathname: '/',
  onError: ({ error, request }: { error?: unknown; request: NextRequest }) => {
    Sentry.captureException(error ?? new Error('AuthKit callback falló sin excepción'), {
      tags: { area: 'auth', route: 'callback' },
      // Solo el pathname: `code` es una credencial viva y `state` lleva la sesión
      // firmada. Ninguno de los dos debe acabar en un reporte de errores.
      extra: { pathname: new URL(request.url).pathname },
    });
    return NextResponse.redirect(new URL('/?auth_error=1', request.url));
  },
});
