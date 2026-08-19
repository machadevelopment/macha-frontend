import { NextRequest, NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api/admin';
import { requireSession } from '@/lib/auth/session';
import { leerCuerpo } from '@/lib/api/json-o-texto';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return NextResponse.json(await adminFetch(`/admin/companies/${params.id}/credits`));
}

/**
 * CU-868kjc7g5 / US-19: abono manual de créditos.
 *
 * Fetch crudo en vez de `adminFetch`, mismo motivo que `/api/insights`: el backend
 * responde 400 con la razón concreta (movimiento en 0, razón vacía) y 403 si quien
 * llama no es `super_admin`. `apiFetch` lanza `ApiError` ante cualquier non-2xx y ese
 * texto se perdería, dejando al operador con un 500 genérico donde había un mensaje que
 * decía exactamente qué corregir.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { accessToken } = await requireSession();
  const body = await request.json();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/admin/companies/${params.id}/credits`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  return NextResponse.json(await leerCuerpo(res), { status: res.status });
}
