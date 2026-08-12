import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';

/**
 * Catálogo de planes para el WIZARD DE ALTA (ticket B4, ronda de QA 2026-08-11).
 *
 * No reusa `app/api/plans/route.ts` y no es duplicación: aquel adjunta el `companyId` de
 * la cookie y pega contra `GET /plans`, que en el backend cuelga de `tenantDerive` y exige
 * una empresa resuelta desde la membresía. Quien está en el wizard TODAVÍA NO TIENE
 * EMPRESA — es lo que está por crear — así que esa ruta le responde 403.
 *
 * Este pega contra `GET /register/plans`, que cuelga de `identityDerive`: sesión
 * verificada y nada más. Por eso tampoco manda `X-Company-Id`: no hay ninguno que mandar,
 * y adjuntar una cookie vieja de otra sesión sería peor que no mandar nada.
 */
export async function GET() {
  const { accessToken } = await requireSession();
  return NextResponse.json(await apiFetch('/register/plans', { accessToken }));
}
