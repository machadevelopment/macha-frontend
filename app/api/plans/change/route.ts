import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { proxyMutation } from '@/lib/api/proxy';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';

/**
 * Cambio de plan (ticket B3). Gateado en el backend con la capacidad `billing`, que ya era
 * `['owner']` en la matriz aprobada por Jose.
 *
 * Va por `proxyMutation` y no por `apiFetch` porque el backend responde con motivos que el
 * usuario puede accionar y que `apiFetch` convertiría en un `"POST /ruta -> 409"`:
 *
 *   · 409 "El plan ya no está disponible" — se retiró del catálogo mientras la pantalla
 *     estaba abierta, y la salida es elegir otro;
 *   · 409 "La empresa no tiene ninguna suscripción" — no lo resuelve reintentando.
 *
 * Un "algo salió mal" genérico ante esos dos deja al owner sin saber qué hacer.
 */
export async function POST(req: Request) {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  return proxyMutation('/plans/change', {
    accessToken,
    companyId,
    method: 'POST',
    body: await req.text(),
  });
}
