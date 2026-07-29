import 'server-only';
import { cache } from 'react';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';

export interface MembershipsResponse {
  memberships: Array<{ companyId: string; companyName: string; role: string }>;
  staffTier: string | null;
}

/**
 * `GET /me/memberships` del backend, memoizado por request (CU-868kh8xfh).
 *
 * Existe para que el layout de `/admin` y las páginas que cuelgan de él no hagan la
 * misma llamada dos veces en un mismo render: `cache()` de React deduplica dentro
 * del request, así que agregar el gate de ruta no suma un round-trip para el staff
 * legítimo (criterio 4 del ticket).
 *
 * La autoridad sigue siendo el backend: este endpoint solo REPORTA lo que
 * `company_users` y `staff` ya dicen en Postgres. Nada de lo que devuelve se usa
 * para conceder acceso a datos — solo para no renderizar pantallas que el backend
 * va a rechazar igual.
 */
export const getMemberships = cache(async (): Promise<MembershipsResponse> => {
  const { accessToken } = await requireSession();
  return apiFetch<MembershipsResponse>('/me/memberships', { accessToken });
});
