import { requireSession } from '@/lib/auth/session';
import { proxyMutation } from '@/lib/api/proxy';

/**
 * Edición de un plan del catálogo (ticket B3). El `code` no se edita —es la PK y la
 * referencia ya escrita en las suscripciones vivas— así que solo hay PATCH sobre los
 * campos comerciales, y no hay DELETE: la baja es lógica (`active: false`).
 */
export async function PATCH(req: Request, { params }: { params: { code: string } }) {
  const { accessToken } = await requireSession();
  return proxyMutation(`/admin/plans/${encodeURIComponent(params.code)}`, {
    accessToken,
    method: 'PATCH',
    body: await req.text(),
  });
}
