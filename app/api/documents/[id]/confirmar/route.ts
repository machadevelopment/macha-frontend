import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch, ApiError } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';

/**
 * Proxy BFF de "todo correcto, publicar" — el que abre el portón.
 *
 * El cuerpo (las hojas que el cliente excluye) se reenvía tal cual: la validación vive en el
 * esquema TypeBox del backend, y repetirla acá daría dos reglas que se desincronizan.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  try {
    const data = await apiFetch(`/documents/${params.id}/confirmar`, {
      method: 'POST',
      accessToken,
      companyId,
      body: JSON.stringify(await request.json()),
      headers: { 'Content-Type': 'application/json' },
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
