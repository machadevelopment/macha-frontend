import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';

// Raw fetch, not apiFetch: a 402 (insufficient_credits) carries {required, balance}
// that the insight button needs to show verbatim — same reasoning as
// app/api/documents/route.ts's upload POST.
export async function POST() {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/insights`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(companyId ? { 'X-Company-Id': companyId } : {}),
    },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
