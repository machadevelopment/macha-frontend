'use server';

import { cookies } from 'next/headers';
import { signOut } from '@workos-inc/authkit-nextjs';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';

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
 */
export async function signOutAction() {
  cookies().delete(ACTIVE_COMPANY_COOKIE);
  await signOut({ returnTo: '/' });
}
