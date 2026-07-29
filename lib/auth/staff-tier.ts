import 'server-only';
import { getMemberships } from '@/lib/auth/memberships';

/**
 * CU-868kh8xfh: tier de staff del usuario, resuelto server-side contra el backend.
 *
 * El valor sale de la tabla `staff` de Postgres (vía `/me/memberships`), NO de una
 * bandera del cliente ni de un claim del JWT sin validar — criterio 2 del ticket.
 *
 * Esto NO es autorización: la autoridad sigue siendo `admin.guard.ts` en
 * macha-backend, que gatea cada `/admin/*` contra la misma tabla. Sirve solo para no
 * renderizar el shell de un panel cuyas llamadas van a devolver 403 — criterio 3, sin
 * duplicar lógica de permisos en el frontend.
 *
 * **Falla cerrado a propósito.** Si el backend no responde no se puede afirmar que
 * quien pide sea staff, así que se trata como no-staff. El coste de equivocarse en
 * esa dirección es que un staff legítimo vea un 404 durante una caída del backend —
 * momento en el que el panel no funcionaría de todos modos.
 */
export async function getStaffTier(): Promise<string | null> {
  try {
    const { staffTier } = await getMemberships();
    return staffTier;
  } catch {
    return null;
  }
}

export async function isStaff(): Promise<boolean> {
  return (await getStaffTier()) !== null;
}
