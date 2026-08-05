import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { proxyMutation } from '@/lib/api/proxy';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';

export async function PATCH(req: Request, { params }: { params: { userId: string } }) {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  return proxyMutation(`/members/${encodeURIComponent(params.userId)}`, {
    accessToken,
    companyId,
    method: 'PATCH',
    body: await req.text(),
  });
}

export async function DELETE(_req: Request, { params }: { params: { userId: string } }) {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  return proxyMutation(`/members/${encodeURIComponent(params.userId)}`, {
    accessToken,
    companyId,
    method: 'DELETE',
  });
}
