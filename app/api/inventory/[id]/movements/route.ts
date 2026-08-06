import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { proxyMutation } from '@/lib/api/proxy';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  return proxyMutation(`/inventory/${params.id}/movements`, {
    accessToken,
    companyId,
    method: 'POST',
    body: await request.text(),
  });
}
