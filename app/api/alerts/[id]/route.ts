import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { ApiError, apiFetch } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';

// CU-868kh8jxf. Proxy BFF con el mismo cableado que /api/reports/[id]: la UI nunca
// sostiene el access token y `company_id` se resuelve server-side. El `X-Company-Id`
// que viaja aquí es solo la preferencia recordada por la UI — `tenant.derive.ts` en el
// backend es lo que de verdad autoriza (y es lo que hace que el alert_event de otra
// empresa devuelva 404, no datos).
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  try {
    const data = await apiFetch(`/alerts/${params.id}`, { accessToken, companyId });
    return NextResponse.json(data);
  } catch (err) {
    // El link llega desde un email, así que un id viejo/ajeno es un caso normal, no un
    // fallo: se propaga el status para que la pantalla muestre "no encontramos esta
    // alerta" en vez de romperse.
    if (err instanceof ApiError) {
      return NextResponse.json({ error: 'not_found' }, { status: err.status });
    }
    throw err;
  }
}
