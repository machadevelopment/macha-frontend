import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';

/**
 * Proxy BFF de las reglas de alerta del CLIENTE (CU-868kh8pwv en el backend, la pantalla
 * es de esta ronda de QA).
 *
 * `GET /alert-rules` existe en macha-backend desde CU-868kh8pwv —tenant-scoped, gateado
 * con la capacidad `configure_alerts`— y no lo consumía nadie: acá solo estaba
 * `app/api/alerts/`, que es el HISTÓRICO de alertas disparadas, otra cosa.
 *
 * NO CONFUNDIR con `app/api/admin/companies/[id]/alert-rules`: esa es la vista de
 * administración de Macha (super_admin, sobre CUALQUIER empresa) y escribe
 * `admin_audit_log`. Esta es la empresa editando lo suyo. Es el mismo dato —la fila de
 * `alert_rules` es una sola— pero otra puerta y otro permiso.
 *
 * El `companyId` de la cookie es solo preferencia de UI: `tenant.derive.ts` lo valida
 * contra las membresías reales en cada request.
 */
export async function GET() {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const data = await apiFetch('/alert-rules', { accessToken, companyId });
  return NextResponse.json(data);
}
