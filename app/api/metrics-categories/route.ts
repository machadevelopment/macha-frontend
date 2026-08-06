import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';
import type { CategoryBreakdownResponse } from '@/lib/api/dashboard';

export async function GET(request: Request) {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';

  const data = await apiFetch<CategoryBreakdownResponse>(
    `/metrics/categories?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { accessToken, companyId },
  );
  return NextResponse.json(data);
}
