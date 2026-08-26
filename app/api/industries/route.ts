import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';

/**
 * Las industrias que el producto reconoce (lista de Jose, 2026-08-25).
 *
 * Devuelve SLUGS. Los rótulos visibles viven en el diccionario de este repo, en los dos
 * idiomas: el backend es dueño de la llave que decide qué plantilla de Excel se sirve, no de
 * cómo se lee en pantalla.
 */
export async function GET() {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const data = await apiFetch<{ industries: string[] }>('/industry-templates/industries', {
    accessToken,
    companyId,
  });
  return NextResponse.json(data);
}
