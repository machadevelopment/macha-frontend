import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';
import type { ArApResponse } from '@/lib/api/dashboard';

export async function GET() {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  const data = await apiFetch<ArApResponse>('/ar-ap', { accessToken, companyId });
  return NextResponse.json(data);
}
