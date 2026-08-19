import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const body = await request.json();
  const data = await apiFetch(`/reports/${params.id}/versions`, {
    method: 'POST',
    accessToken,
    companyId,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return NextResponse.json(data);
}
