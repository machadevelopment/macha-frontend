import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch, ApiError } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';

/**
 * Proxy BFF de "esta hoja sí debería contar" / "el monto está en otra columna" (migración
 * 0043).
 *
 * El cuerpo se reenvía tal cual: la validación vive en el esquema TypeBox del backend, y
 * repetirla acá daría dos reglas que se desincronizan.
 *
 * ⚠️ El 409 de "esta carga ya se publicó" tiene que LLEGAR al cliente con su código. Un proxy
 * que lo convierte en 500 le diría al dueño que algo se rompió, cuando lo que pasó es que su
 * carga ya está en el dashboard y el camino es revertirla.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  try {
    const data = await apiFetch(`/documents/${params.id}/corregir-hoja`, {
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
