import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';

/**
 * El tipo de cambio de la empresa activa, que ahora el cliente mantiene (decisión de Jose,
 * 2026-08-25). El backend decide el rol: `owner` y `admin` pueden escribir, cualquiera puede
 * leer. Acá no se replica esa regla — replicarla sería tener la decisión en dos lugares.
 */
export interface FxRateResponse {
  baseCurrency: 'GTQ' | 'USD';
  quoteCurrency: 'GTQ' | 'USD';
  rates: {
    id: string;
    baseCurrency: string;
    quoteCurrency: string;
    rate: string;
    effectiveDate: string;
    createdAt: string;
  }[];
  /** Contrato, no adorno: la pantalla tiene que poder decir que no recalcula lo ya cargado. */
  appliesRetroactively: boolean;
}

export async function GET() {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const data = await apiFetch<FxRateResponse>('/fx-rate', { accessToken, companyId });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const body = (await request.json()) as unknown;

  const data = await apiFetch<{ id: string; replaced: boolean; appliesRetroactively: boolean }>(
    '/fx-rate',
    {
      accessToken,
      companyId,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  return NextResponse.json(data);
}
