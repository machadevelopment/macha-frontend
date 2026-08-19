import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';
import type { ArApResponse } from '@/lib/api/dashboard';

export async function GET() {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const data = await apiFetch<ArApResponse>('/ar-ap', { accessToken, companyId });
  return NextResponse.json(data);
}
