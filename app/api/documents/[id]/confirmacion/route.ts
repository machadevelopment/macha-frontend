import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch, ApiError } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';

/**
 * Proxy BFF de "qué entendimos de tu archivo, antes de publicarlo".
 *
 * Devuelve el resumen POR HOJA con el dinero que cada una aporta, y si la carga ya fue
 * confirmada. Es lo que el portón (migración 0042) le muestra al dueño antes de que su
 * contabilidad entre al dashboard.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  try {
    const data = await apiFetch(`/documents/${params.id}/confirmacion`, {
      accessToken,
      companyId,
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
