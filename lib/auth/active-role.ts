import 'server-only';
import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { ACTIVE_COMPANY_COOKIE } from '@/app/actions/set-active-company';

interface MembershipsResponse {
  memberships: Array<{ companyId: string; companyName: string; role: string }>;
  staffTier: string | null;
}

/**
 * CU-868kh8nhy: rol del usuario en la empresa activa, resuelto server-side.
 *
 * Sirve SOLO para no renderizar acciones que el backend va a rechazar de todos modos
 * (p. ej. el botón de revertir, que exige owner/admin). **No es autorización**: la
 * autoridad sigue siendo `assertClientCapability` en macha-backend. Si esto devolviera
 * un rol inflado, el backend seguiría respondiendo 403 — por eso se puede resolver
 * aquí sin duplicar la matriz de permisos en el frontend.
 */
export async function getActiveRole(): Promise<string | null> {
  const { accessToken } = await requireSession();
  const data = await apiFetch<MembershipsResponse>('/me/memberships', { accessToken });

  const activeCompanyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  const membership = activeCompanyId
    ? data.memberships.find((m) => m.companyId === activeCompanyId)
    : data.memberships[0];

  return membership?.role ?? null;
}
