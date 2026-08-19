import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch, ApiError } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';

/**
 * Proxy BFF de la CANCELACIÓN de una carga en curso. Mismo patrón que `revert/route.ts`: la
 * autorización real la resuelve macha-backend y aquí no se duplica.
 *
 * Existe porque un documento en `queued`/`processing` no tenía ninguna salida — `revert`
 * exige `promoted` y reintentar no aplica con el job vivo. El usuario se quedaba mirando
 * "PROCESSING" sin poder hacer nada (reportado el 2026-08-14).
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  try {
    const data = await apiFetch(`/documents/${params.id}/cancel`, {
      method: 'POST',
      accessToken,
      companyId,
    });
    return NextResponse.json(data);
  } catch (err) {
    // Propaga el status real: 403 sin permiso, 409 si la carga ya terminó. Convertirlo en
    // un 500 opaco dejaría al usuario sin saber por qué el botón no hizo nada.
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
