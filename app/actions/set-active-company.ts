'use server';

import { cookies } from 'next/headers';

export const ACTIVE_COMPANY_COOKIE = 'macha-company-id';

/**
 * Persists the org-switcher's selection (CU-868kfva6c). This is a UI preference
 * only, not an authorization grant: `X-Company-Id` built from this cookie is
 * validated against the user's real memberships server-side in macha-backend's
 * tenant.derive.ts on every request — never trusted client-side (CLAUDE.md).
 * Not localStorage/sessionStorage (also prohibited by CLAUDE.md) because a
 * cookie is what's readable both client-side and in Server Components for the
 * first fetch of each page.
 */
export async function setActiveCompany(companyId: string) {
  cookies().set(ACTIVE_COMPANY_COOKIE, companyId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  });
}
