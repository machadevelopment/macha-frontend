import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { ACTIVE_COMPANY_COOKIE } from '@/app/actions/set-active-company';
import type { MetricsResponse } from '@/lib/api/dashboard';

export async function GET(request: NextRequest) {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  const months = request.nextUrl.searchParams.get('months');
  const qs = months ? `?months=${encodeURIComponent(months)}` : '';
  const data = await apiFetch<MetricsResponse>(`/metrics${qs}`, { accessToken, companyId });
  return NextResponse.json(data);
}
