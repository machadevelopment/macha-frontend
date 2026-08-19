import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { paginationSuffix } from '@/lib/api/pagination';
import { activeCompanyId } from '@/lib/auth/active-company-server';

// CU-868kh913c: reenvía limit/offset para el "load more".
export async function GET(request: NextRequest) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const data = await apiFetch(`/reports${paginationSuffix(request)}`, { accessToken, companyId });
  return NextResponse.json(data);
}
