import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { proxyMutation } from '@/lib/api/proxy';
import { activeCompanyId } from '@/lib/auth/active-company-server';
import type { Invitation } from '@/lib/api/members';

export async function GET() {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const data = await apiFetch<Invitation[]>('/members/invitations', { accessToken, companyId });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  return proxyMutation('/members/invitations', {
    accessToken,
    companyId,
    method: 'POST',
    body: await req.text(),
  });
}
