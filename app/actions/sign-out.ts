'use server';

import { signOut } from '@workos-inc/authkit-nextjs';

/**
 * Cierre de sesión desde el `side-bot` del shell (CU-868khvynk, criterio 4).
 *
 * Antes vivía como server action inline dentro de `app/(app)/page.tsx`, así que solo
 * se podía cerrar sesión desde `/`. El shell es un client component (necesita
 * `usePathname` y el estado de colapso), y un client component no puede declarar
 * server actions inline — de ahí este módulo.
 *
 * La sesión la destruye WorkOS/AuthKit: aquí no se toca ninguna cookie de auth a mano.
 */
export async function signOutAction() {
  await signOut({ returnTo: '/' });
}
