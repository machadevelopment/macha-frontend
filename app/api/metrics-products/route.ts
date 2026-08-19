import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';
import type { ProductRevenueResponse } from '@/lib/api/dashboard';

export async function GET(request: Request) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
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
