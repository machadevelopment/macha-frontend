import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { apiFetch, ApiError } from '@/lib/api/client';
import { ACTIVE_COMPANY_COOKIE } from '@/app/actions/set-active-company';

/**
 * CU-868kh8nhy: proxy BFF de la reversión de una carga. La autorización real
 * (`revert_upload`, owner/admin) la resuelve macha-backend — aquí no se duplica.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  try {
    const data = await apiFetch(`/documents/${params.id}/revert`, {
      method: 'POST',
      accessToken,
      companyId,
    });
    return NextResponse.json(data);
  } catch (err) {
    // Propaga el status real del backend (403 sin permiso, 409 si el documento no
    // está promovido) en vez de convertir todo en un 500 opaco.
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
