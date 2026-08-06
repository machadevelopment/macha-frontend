import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';
import type { ProductRevenueResponse } from '@/lib/api/dashboard';

export async function GET(request: Request) {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams({
    from: searchParams.get('from') ?? '',
    to: searchParams.get('to') ?? '',
    limit: searchParams.get('limit') ?? '5',
  });
  const data = await apiFetch<ProductRevenueResponse>(`/metrics/products?${qs}`, {
    accessToken,
    companyId,
  });
  return NextResponse.json(data);
}
