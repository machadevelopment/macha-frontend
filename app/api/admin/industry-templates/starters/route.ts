import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';

/**
 * Historial de plantillas .xlsx descargables por industria (pedido de Jose, 2026-08-20).
 *
 * Sin `X-Company-Id`, y no es un olvido: `industry_starter_templates` es catálogo de
 * PLATAFORMA. La plantilla de "retail" es la misma para todos los clientes de retail y no
 * contiene un dato de ninguno. Mandar una empresa acá sugeriría un aislamiento que no existe
 * ni tiene por qué existir; lo que autoriza es el guard de `/admin/*`.
 */
export async function GET() {
  const { accessToken } = await requireSession();
  const data = await apiFetch('/admin/industry-templates/starters', { accessToken });
  return NextResponse.json(data);
}
