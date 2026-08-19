import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';

/**
 * Catálogo del generador de reportes (ticket B2): tipos, secciones disponibles y los dos
 * topes (rango máximo en días y largo máximo de las instrucciones).
 *
 * Los topes viajan desde el backend en vez de duplicarse acá a propósito. Son reglas suyas
 * —el rango se limita porque la serie diaria viaja entera al prompt de Claude y al
 * snapshot del ledger— y una copia en el frontend se desincroniza en silencio: la pantalla
 * dejaría pasar un rango que el backend rechaza, o bloquearía uno que aceptaría.
 */
export async function GET() {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  return NextResponse.json(await apiFetch('/reports/catalog', { accessToken, companyId }));
}
