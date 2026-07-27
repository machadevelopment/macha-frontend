import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { apiFetchRaw } from '@/lib/api/client';
import { ACTIVE_COMPANY_COOKIE } from '@/app/actions/set-active-company';

// Binary passthrough — apiFetchRaw (not apiFetch) so the .xlsx bytes and the
// backend's Content-Disposition/Content-Type headers reach the browser untouched.
export async function GET() {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  const res = await apiFetchRaw('/industry-templates/download', { accessToken, companyId });
  return new Response(res.body, {
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/octet-stream',
      'content-disposition': res.headers.get('content-disposition') ?? 'attachment',
    },
  });
}
