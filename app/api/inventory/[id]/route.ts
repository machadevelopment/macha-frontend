import { requireSession } from '@/lib/auth/session';
import { proxyMutation } from '@/lib/api/proxy';
import { activeCompanyId } from '@/lib/auth/active-company-server';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  return proxyMutation(`/inventory/${params.id}`, {
    accessToken,
    companyId,
    method: 'PATCH',
    body: await request.text(),
  });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  return proxyMutation(`/inventory/${params.id}`, {
    accessToken,
    companyId,
    method: 'DELETE',
  });
}
