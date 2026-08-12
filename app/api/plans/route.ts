import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';

/**
 * Proxy BFF del catálogo de planes del CLIENTE (ticket B3, ronda de QA 2026-08-11).
 *
 * Devuelve el plan actual de la empresa MÁS el catálogo de planes activos, en una sola
 * llamada: la pantalla necesita los dos para poder comparar, y partirlo en dos requests
 * abriría un estado intermedio donde se ve el catálogo sin saber en cuál estás.
 *
 * NO CONFUNDIR con `app/api/admin/plans`: esa es la gestión del catálogo por parte de
 * Macha (`super_admin`, con `admin_audit_log`). Esta solo lee, y la lee el cliente.
 *
 * El `companyId` de la cookie es preferencia de UI: `tenant.derive.ts` lo valida contra
 * las membresías reales en cada request.
 */
export async function GET() {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  return NextResponse.json(await apiFetch('/plans', { accessToken, companyId }));
}
