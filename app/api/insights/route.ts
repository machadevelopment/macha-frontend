import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { activeCompanyId } from '@/lib/auth/active-company-server';
import { leerCuerpo } from '@/lib/api/json-o-texto';

// Raw fetch, not apiFetch: a 402 (insufficient_credits) carries {required, balance}
// that the insight button needs to show verbatim — same reasoning as
// app/api/documents/route.ts's upload POST.
export async function POST() {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/insights`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(companyId ? { 'X-Company-Id': companyId } : {}),
    },
  });
  const data = await leerCuerpo(res);
  return NextResponse.json(data, { status: res.status });
}
