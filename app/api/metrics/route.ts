import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';
import type { MetricsResponse } from '@/lib/api/dashboard';

export async function GET(request: NextRequest) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const months = request.nextUrl.searchParams.get('months');
  const qs = months ? `?months=${encodeURIComponent(months)}` : '';
  const data = await apiFetch<MetricsResponse>(`/metrics${qs}`, { accessToken, companyId });
  return NextResponse.json(data);
}
