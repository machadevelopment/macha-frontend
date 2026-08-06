import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';
import type { PeriodMetricsResponse } from '@/lib/api/dashboard';

// BFF del filtro de período. `from`/`to` se reenvían tal cual: el backend los valida
// con su propio patrón y rechaza un rango invertido, así que duplicar esa validación
// acá solo crearía dos reglas que pueden divergir.
export async function GET(request: Request) {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';

  const data = await apiFetch<PeriodMetricsResponse>(
    `/metrics/period?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { accessToken, companyId },
  );
  return NextResponse.json(data);
}
