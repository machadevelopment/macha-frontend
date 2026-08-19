import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';

/**
 * Descarga de un reporte en PDF o Excel (ticket B2).
 *
 * NO devuelve el binario: devuelve una URL PREFIRMADA de S3, de vida corta, exactamente
 * como hace `/reports/[id]/view` con el HTML. La regla de CLAUDE.md es que S3 guarda los
 * binarios y la base solo las llaves; hacer pasar 2 MB de PDF por esta ruta serverless
 * sería duplicar el ancho de banda y perder el streaming directo de S3, a cambio de nada.
 *
 * `format` viaja como segmento y el backend lo estrecha a `pdf|xlsx` con TypeBox — no se
 * revalida acá para no tener dos listas que puedan divergir.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string; format: string } },
) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const data = await apiFetch<{ url: string; format: string; expiresInSeconds: number }>(
    `/reports/${encodeURIComponent(params.id)}/export/${encodeURIComponent(params.format)}`,
    { accessToken, companyId },
  );
  return NextResponse.json(data);
}
