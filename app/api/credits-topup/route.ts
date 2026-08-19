import { NextResponse, type NextRequest } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch, ApiError } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';
import type { CreditsTopupRequest, CreditsTopupResponse } from '@/lib/api/billing';

// BFF proxy (CU-868kfvaet): forwards to macha-backend's POST /credits/topup
// (tenantDerive + 'billing' capability, owner-only — enforced server-side, this
// route just relays whatever status the backend returns).
export async function POST(request: NextRequest) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const body = (await request.json()) as CreditsTopupRequest;
  try {
    const data = await apiFetch<CreditsTopupResponse>('/credits/topup', {
      method: 'POST',
      accessToken,
      companyId,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
