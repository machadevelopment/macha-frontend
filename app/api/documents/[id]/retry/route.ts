import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch, ApiError } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';

/**
 * Proxy BFF del reintento de una carga fallida. La autorización real (`upload_excel`) y
 * la regla de qué estados se pueden reintentar las resuelve macha-backend — aquí no se
 * duplican. Mismo patrón que `revert/route.ts`.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  try {
    const data = await apiFetch(`/documents/${params.id}/retry`, {
      method: 'POST',
      accessToken,
      companyId,
    });
    return NextResponse.json(data);
  } catch (err) {
    // Propaga el status real del backend (403 sin permiso, 409 si el documento no está
    // fallido, 429 si la cola está llena) en vez de convertir todo en un 500 opaco.
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
