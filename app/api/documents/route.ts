import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { paginationSuffix } from '@/lib/api/pagination';
import { activeCompanyId } from '@/lib/auth/active-company-server';
import { leerCuerpo } from '@/lib/api/json-o-texto';

// BFF proxy (CU-868kfva7z) — same reasoning as /api/memberships: the upload UI
// never holds an access token, and company_id resolution stays server-side
// (CLAUDE.md). `X-Company-Id` here is only the UI's remembered preference;
// tenant.derive.ts on the backend is what actually authorizes it per request.
// CU-868kh913c: reenvía limit/offset. Antes el backend truncaba a 50 en silencio y
// no había forma de pedir el resto.
export async function GET(request: NextRequest) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const data = await apiFetch(`/documents${paginationSuffix(request)}`, { accessToken, companyId });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
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
  const data = await leerCuerpo(res);
  return NextResponse.json(data, { status: res.status });
}
