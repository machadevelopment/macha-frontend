import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';
import type { StoreBreakdownResponse } from '@/lib/api/dashboard';

export async function GET(request: Request) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';

  const data = await apiFetch<StoreBreakdownResponse>(
    `/metrics/stores?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { accessToken, companyId },
  );
  return NextResponse.json(data);
}
