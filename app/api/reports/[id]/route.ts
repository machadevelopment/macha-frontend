import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { ACTIVE_COMPANY_COOKIE } from '@/app/actions/set-active-company';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  const data = await apiFetch(`/reports/${params.id}`, { accessToken, companyId });
  return NextResponse.json(data);
}
