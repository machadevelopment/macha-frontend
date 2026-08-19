import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';
import type { PeriodMetricsResponse } from '@/lib/api/dashboard';

// BFF del filtro de período. `from`/`to` se reenvían tal cual: el backend los valida
// con su propio patrón y rechaza un rango invertido, así que duplicar esa validación
// acá solo crearía dos reglas que pueden divergir.
export async function GET(request: Request) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';

  const data = await apiFetch<PeriodMetricsResponse>(
    `/metrics/period?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { accessToken, companyId },
  );
  return NextResponse.json(data);
}
