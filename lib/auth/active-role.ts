import 'server-only';
import { cookies } from 'next/headers';
import { getMemberships } from '@/lib/auth/memberships';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';

/**
 * CU-868kh8nhy: rol del usuario en la empresa activa, resuelto server-side.
 *
 * Sirve SOLO para no renderizar acciones que el backend va a rechazar de todos modos
 * (p. ej. el botón de revertir, que exige owner/admin). **No es autorización**: la
 * autoridad sigue siendo `assertClientCapability` en macha-backend. Si esto devolviera
 * un rol inflado, el backend seguiría respondiendo 403 — por eso se puede resolver
 * aquí sin duplicar la matriz de permisos en el frontend.
 *
 * CU-868kh8xfh: la llamada a `/me/memberships` se movió a `memberships.ts`, memoizada
 * por request, para compartirla con el gate de `/admin` sin duplicar el round-trip.
 */
export async function getActiveRole(): Promise<string | null> {
  const data = await getMemberships();

  const activeCompanyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  const membership = activeCompanyId
    ? data.memberships.find((m) => m.companyId === activeCompanyId)
    : data.memberships[0];

  return membership?.role ?? null;
}
