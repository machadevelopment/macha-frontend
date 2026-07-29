import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { paginationSuffix } from '@/lib/api/pagination';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';

// CU-868kh913c: reenvía limit/offset para el "load more".
export async function GET(request: NextRequest) {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  const data = await apiFetch(`/reports${paginationSuffix(request)}`, { accessToken, companyId });
  return NextResponse.json(data);
}
