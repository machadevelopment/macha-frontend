import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';

export interface Membership {
  companyId: string;
  companyName: string;
  role: string;
}

interface MembershipsResponse {
  memberships: Membership[];
  staffTier: string | null;
}

// BFF proxy (CU-868kfva6c): the org-switcher client component can't call
// macha-backend directly — it has no way to hold the WorkOS access token, and
// CLAUDE.md requires company_id/identity resolution to stay server-side. This
// route runs server-side, attaches the session's access token, and forwards
// the backend's /me/memberships response as-is.
export async function GET() {
  const { accessToken } = await requireSession();
  const data = await apiFetch<MembershipsResponse>('/me/memberships', { accessToken });
  return NextResponse.json(data);
}
