import { NextResponse, type NextRequest } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch, ApiError } from '@/lib/api/client';
import type { RegisterRequest, RegisterResponse } from '@/lib/api/billing';

// BFF proxy (CU-868kfvae1): the wizard client component can't hold the WorkOS
// access token — this route runs server-side, attaches it, and forwards to
// macha-backend's POST /register. No X-Company-Id: the caller has no company
// yet, that's exactly what this endpoint creates (identityDerive, not tenantDerive).
export async function POST(request: NextRequest) {
  const { accessToken } = await requireSession();
  const body = (await request.json()) as RegisterRequest;
  try {
    const data = await apiFetch<RegisterResponse>('/register', {
      method: 'POST',
      accessToken,
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
