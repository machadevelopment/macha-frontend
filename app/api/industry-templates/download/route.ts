import { requireSession } from '@/lib/auth/session';
import { apiFetchRaw } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';

// Binary passthrough — apiFetchRaw (not apiFetch) so the .xlsx bytes and the
// backend's Content-Disposition/Content-Type headers reach the browser untouched.
export async function GET() {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const res = await apiFetchRaw('/industry-templates/download', { accessToken, companyId });
  return new Response(res.body, {
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/octet-stream',
      'content-disposition': res.headers.get('content-disposition') ?? 'attachment',
    },
  });
}
