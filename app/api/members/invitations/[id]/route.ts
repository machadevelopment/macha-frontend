import { requireSession } from '@/lib/auth/session';
import { proxyMutation } from '@/lib/api/proxy';
import { activeCompanyId } from '@/lib/auth/active-company-server';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  return proxyMutation(`/members/invitations/${encodeURIComponent(params.id)}`, {
    accessToken,
    companyId,
    method: 'DELETE',
  });
}
