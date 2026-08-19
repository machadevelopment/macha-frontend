import { requireSession } from '@/lib/auth/session';
import { proxyMutation } from '@/lib/api/proxy';
import { activeCompanyId } from '@/lib/auth/active-company-server';

export async function PATCH(req: Request, { params }: { params: { userId: string } }) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  return proxyMutation(`/members/${encodeURIComponent(params.userId)}`, {
    accessToken,
    companyId,
    method: 'PATCH',
    body: await req.text(),
  });
}

export async function DELETE(_req: Request, { params }: { params: { userId: string } }) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  return proxyMutation(`/members/${encodeURIComponent(params.userId)}`, {
    accessToken,
    companyId,
    method: 'DELETE',
  });
}
