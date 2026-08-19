import { requireSession } from '@/lib/auth/session';
import { proxyMutation } from '@/lib/api/proxy';
import { activeCompanyId } from '@/lib/auth/active-company-server';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  return proxyMutation(`/inventory/${params.id}/movements`, {
    accessToken,
    companyId,
    method: 'POST',
    body: await request.text(),
  });
}
