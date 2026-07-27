import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { ACTIVE_COMPANY_COOKIE } from '@/app/actions/set-active-company';

// BFF proxy (CU-868kfva7z) — same reasoning as /api/memberships: the upload UI
// never holds an access token, and company_id resolution stays server-side
// (CLAUDE.md). `X-Company-Id` here is only the UI's remembered preference;
// tenant.derive.ts on the backend is what actually authorizes it per request.
export async function GET() {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  const data = await apiFetch('/documents', { accessToken, companyId });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  const formData = await request.formData();

  // Raw fetch, not apiFetch: caps rejections (413/402/429/415) carry a specific,
  // locale-aware `{error}` message from the backend (CU-868kfva7z criterio 3) that
  // the dropzone must show verbatim — apiFetch's ApiError would discard that body.
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(companyId ? { 'X-Company-Id': companyId } : {}),
    },
    body: formData,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
