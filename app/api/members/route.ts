import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';
import type { Member } from '@/lib/api/members';

export async function GET() {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const data = await apiFetch<Member[]>('/members/', { accessToken, companyId });
  return NextResponse.json(data);
}
