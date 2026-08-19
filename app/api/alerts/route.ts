import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { paginationSuffix } from '@/lib/api/pagination';
import { activeCompanyId } from '@/lib/auth/active-company-server';

/**
 * CU-868kj0tdq criterio 2: proxy BFF del histórico de alertas.
 *
 * `GET /alerts` existía en el backend desde CU-868kfvad3 (paginado, tenant-scoped,
 * gate `view_dashboard_reports`) y no lo consumía nadie: acá solo había
 * `app/api/alerts/[id]/route.ts`, el del deep-link del email.
 *
 * Misma forma que `app/api/reports/route.ts` — reenvía `limit`/`offset` y adjunta el
 * `companyId` de la cookie. Ese id es solo una preferencia de UI: el backend lo valida
 * contra las membresías reales en `tenant.derive.ts` en cada request.
 */
export async function GET(request: NextRequest) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const data = await apiFetch(`/alerts${paginationSuffix(request)}`, { accessToken, companyId });
  return NextResponse.json(data);
}
