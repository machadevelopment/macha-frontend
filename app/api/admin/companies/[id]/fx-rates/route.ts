import { NextRequest, NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api/admin';
import { requireSession } from '@/lib/auth/session';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return NextResponse.json(await adminFetch(`/admin/companies/${params.id}/fx-rates`));
}

/**
 * Registrar una tasa de cambio.
 *
 * Fetch crudo en vez de `adminFetch`, mismo motivo que el abono de créditos: el backend
 * responde 400 con la razón concreta ("GTQ es la moneda base de esta empresa", "la tasa
 * debe ser mayor que 0") y 403 si quien llama no es `super_admin`. `apiFetch` lanza
 * `ApiError` ante cualquier non-2xx y ese texto se perdería justo donde más importa:
 * mover una tasa mueve todas las cifras convertidas que se promuevan después.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { accessToken } = await requireSession();
  const body = await request.json();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/admin/companies/${params.id}/fx-rates`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  return NextResponse.json(await res.json(), { status: res.status });
}
