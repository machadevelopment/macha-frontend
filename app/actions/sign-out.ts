'use server';

import { cookies } from 'next/headers';
import { signOut } from '@workos-inc/authkit-nextjs';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';
import { urlCanonica } from '@/lib/auth/canonical-origin';

/**
 * Cierre de sesión desde el `side-bot` del shell (CU-868khvynk, criterio 4).
 *
 * Antes vivía como server action inline dentro de `app/(app)/page.tsx`, así que solo
 * se podía cerrar sesión desde `/`. El shell es un client component (necesita
 * `usePathname` y el estado de colapso), y un client component no puede declarar
 * server actions inline — de ahí este módulo.
 *
 * La sesión la destruye WorkOS/AuthKit: aquí no se toca ninguna cookie de auth a mano.
 *
 * PERO la preferencia de empresa activa SÍ se borra acá, y no es limpieza cosmética: es una
 * cookie de 30 días que WorkOS no conoce, así que sobrevivía al cierre de sesión y el
 * siguiente usuario de ese navegador arrancaba pidiendo datos de la empresa del anterior
 * (403 del backend, pantalla en error). Ver `lib/auth/active-company-server.ts`.
 *
 * Es la segunda de dos defensas, no la única: el valor de la cookie lleva además el usuario
 * adentro, porque el caso que se observó en producción no fue un logout — fue registrar una
 * cuenta nueva encima de una sesión previa, donde esto no llega a ejecutarse.
 *
 * ═══ EL DESTINO ES UNA URL ABSOLUTA, Y ESO ERA EL BUG (reporte de Jose, 2026-08-26) ═══
 *
 * Decía `returnTo: '/'`. El SDK de WorkOS mete ese valor tal cual en el query del endpoint de
 * logout (`url.searchParams.set("return_to", returnTo)`), y WorkOS no puede redirigir a una
 * ruta relativa: no sabe de qué host. Cae entonces a la URI configurada en su dashboard, que
 * es la de Vercel — *"cuando le doy logout a la plataforma, me vuelve a mandar al URL de
 * Vercel"*, con la captura mostrando `macha-finance.vercel.app`.
 *
 * Lo que hace difícil de encontrar este bug es que la causa no está donde se ve el síntoma:
 * ningún archivo de este repo menciona `vercel.app`, y el destino lo elige WorkOS porque
 * nosotros no le dijimos ninguno usable.
 *
 * El origen sale de `NEXT_PUBLIC_WORKOS_REDIRECT_URI`, que es la MISMA fuente que usa el login
 * y la única ya registrada en WorkOS. Ver `lib/auth/canonical-origin.ts` para por qué no se
 * agrega una variable nueva, y para la mitad que el código no puede arreglar.
 */
export async function signOutAction() {
  cookies().delete(ACTIVE_COMPANY_COOKIE);
  await signOut({ returnTo: urlCanonica('/') });
}
