import { requireSession } from '@/lib/auth/session';
import { proxyMutation } from '@/lib/api/proxy';
import { activeCompanyId } from '@/lib/auth/active-company-server';

/**
 * Dar por saldada una cuenta, o deshacerlo — CU-868kx4cr6.
 *
 * El rol lo decide el backend (`settle_receivables`). Acá no se replica esa regla: replicarla
 * sería tener la matriz de permisos en dos lugares, y el que manda es el que toca la base.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { cara: string; id: string } },
) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  return proxyMutation(
    `/receivables/${encodeURIComponent(params.cara)}/${encodeURIComponent(params.id)}`,
    {
      accessToken,
      companyId,
      method: 'PATCH',
      body: await request.text(),
    },
  );
}
