import 'server-only';
import { requireSession } from '@/lib/auth/session';
import { getMemberships } from '@/lib/auth/memberships';
import { activeCompanyId } from '@/lib/auth/active-company-server';

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
  const [{ user }, data] = await Promise.all([requireSession(), getMemberships()]);

  /*
   * La cookie se lee ATADA AL USUARIO (2026-08-19). Antes se leía cruda, y como sobrevive al
   * cambio de cuenta, un navegador con una sesión previa resolvía el rol contra la empresa de
   * OTRA persona — que acá no encuentra membresía y cae al `?? null`, o sea que escondía
   * acciones que el usuario sí tenía permitidas. Ver `lib/auth/active-company-server.ts`.
   */
  const activeCompany = activeCompanyId(user.id);
  const membership = activeCompany
    ? data.memberships.find((m) => m.companyId === activeCompany)
    : data.memberships[0];

  return membership?.role ?? null;
}
