import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const data = await apiFetch<{ url: string }>(`/reports/${params.id}/view`, {
    accessToken,
    companyId,
  });
  return NextResponse.json(data);
}
