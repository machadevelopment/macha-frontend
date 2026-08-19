import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const data = await apiFetch(`/chats/${params.id}/messages`, { accessToken, companyId });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const body = await request.json();
  const data = await apiFetch(`/chats/${params.id}/messages`, {
    method: 'POST',
    accessToken,
    companyId,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return NextResponse.json(data);
}
