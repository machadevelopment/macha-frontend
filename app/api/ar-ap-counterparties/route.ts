import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';
import type { ArApCounterpartiesResponse } from '@/lib/api/dashboard';

/**
 * Concentración de la cartera por contraparte (CU-868kt29t0).
 *
 * Ruta propia y no un campo más de `/api/ar-ap`: aquella la pide el DASHBOARD en cada
 * carga y solo pinta los cinco tramos de antigüedad. Esta la pide únicamente quien abre los
 * tabs de Por cobrar o Por pagar.
 *
 * `limit` se reenvía y no se fija acá: el tope real lo acota el backend (50). Ponerle un
 * número a este lado sería una segunda regla que puede divergir de la que manda.
 *
 * Sin `from`/`to`, igual que `/api/ar-ap`: la cartera abierta es estado vivo, no una serie
 * del período — una factura de marzo que sigue impaga pertenece a la respuesta aunque el
 * filtro diga "este mes".
 */
export async function GET(request: NextRequest) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const limit = request.nextUrl.searchParams.get('limit');
  const data = await apiFetch<ArApCounterpartiesResponse>(
    `/ar-ap/counterparties${limit ? `?limit=${encodeURIComponent(limit)}` : ''}`,
    { accessToken, companyId },
  );
  return NextResponse.json(data);
}
