import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';

export async function GET() {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  const data = await apiFetch('/chats', { accessToken, companyId });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  const body = await request.json().catch(() => ({}));
  const data = await apiFetch('/chats', {
    method: 'POST',
    accessToken,
    companyId,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return NextResponse.json(data);
}
