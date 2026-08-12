import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';

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
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  return NextResponse.json(await apiFetch('/reports/catalog', { accessToken, companyId }));
}
