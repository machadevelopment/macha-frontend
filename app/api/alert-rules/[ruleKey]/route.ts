import { requireSession } from '@/lib/auth/session';
import { proxyMutation } from '@/lib/api/proxy';
import { activeCompanyId } from '@/lib/auth/active-company-server';

/**
 * `PATCH /alert-rules/:ruleKey` — umbral y encendido de una regla.
 *
 * Va por `proxyMutation` y no por `apiFetch` a propósito: el backend valida el umbral por
 * unidad (`validateThreshold`) y responde 422 con el motivo exacto — "Un umbral en
 * porcentaje debe estar entre 0 y 100", "Un umbral en días debe ser un número entero de
 * al menos 1". `apiFetch` lanza `ApiError` en cualquier non-2xx y su mensaje es
 * `"PATCH /ruta -> 422"`, así que el motivo se perdería y la pantalla solo podría decir
 * "algo salió mal" ante un error que el usuario SÍ puede corregir. El criterio del
 * ticket es literalmente "mostrar el error del backend".
 */
export async function PATCH(req: Request, { params }: { params: { ruleKey: string } }) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  return proxyMutation(`/alert-rules/${encodeURIComponent(params.ruleKey)}`, {
    accessToken,
    companyId,
    method: 'PATCH',
    body: await req.text(),
  });
}
