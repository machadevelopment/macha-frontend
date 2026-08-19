import { requireSession } from '@/lib/auth/session';
import { proxyMutation } from '@/lib/api/proxy';
import { activeCompanyId } from '@/lib/auth/active-company-server';

/**
 * Generación de reporte a demanda (ticket B2). GASTA CRÉDITOS, así que el backend la gatea
 * con `edit_send_reports` (owner/admin) y no con la capacidad de solo lectura.
 *
 * Va por `proxyMutation` y no por `apiFetch`, y acá el motivo es más fuerte que en
 * cualquier otra ruta: el backend responde **402 con `{ required, balance }`**, y esos dos
 * números son la única forma de decirle al usuario "necesitás 5 y tenés 2" en vez de un
 * "no se pudo" que no explica si el problema se arregla comprando créditos o esperando.
 * `apiFetch` los tiraría y dejaría `"POST /reports/generate -> 402"`.
 *
 * Lo mismo para el 429 con `reason: 'queue_full'`, que sí se arregla reintentando en un
 * rato, y para el 400 del rango fuera de tope.
 */
export async function POST(req: Request) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  return proxyMutation('/reports/generate', {
    accessToken,
    companyId,
    method: 'POST',
    body: await req.text(),
  });
}
