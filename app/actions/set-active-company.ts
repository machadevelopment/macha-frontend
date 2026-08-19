'use server';

import { cookies } from 'next/headers';
// La constante vive en lib/auth/active-company.ts: un archivo "use server" solo puede
// exportar funciones async (CU-868khttg2). Ver la nota de ese módulo.
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';
import { serializeActiveCompany } from '@/lib/auth/active-company-server';
import { requireSession } from '@/lib/auth/session';

/**
 * Persists the org-switcher's selection (CU-868kfva6c). This is a UI preference
 * only, not an authorization grant: `X-Company-Id` built from this cookie is
 * validated against the user's real memberships server-side in macha-backend's
 * tenant.derive.ts on every request — never trusted client-side (CLAUDE.md).
 * Not localStorage/sessionStorage (also prohibited by CLAUDE.md) because a
 * cookie is what's readable both client-side and in Server Components for the
 * first fetch of each page.
 *
 * El valor lleva el USUARIO adentro desde 2026-08-19: guardar el `company_id` pelado hacía
 * que la preferencia sobreviviera al cambio de cuenta y el BFF terminara pidiendo datos de
 * una empresa ajena. Ver `lib/auth/active-company-server.ts` para el fallo completo.
 */
export async function setActiveCompany(companyId: string) {
  const { user } = await requireSession();
  cookies().set(ACTIVE_COMPANY_COOKIE, serializeActiveCompany(user.id, companyId), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  });
}
