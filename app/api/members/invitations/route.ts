import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { proxyMutation } from '@/lib/api/proxy';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';
import type { Invitation } from '@/lib/api/members';

export async function GET() {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  const data = await apiFetch<Invitation[]>('/members/invitations', { accessToken, companyId });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  return proxyMutation('/members/invitations', {
    accessToken,
    companyId,
    method: 'POST',
    body: await req.text(),
  });
}
