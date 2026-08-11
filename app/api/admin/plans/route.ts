import { NextRequest, NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api/admin';
import { requireSession } from '@/lib/auth/session';
import { proxyMutation } from '@/lib/api/proxy';

/**
 * Gestión del catálogo de planes por parte de Macha (ticket B3). `super_admin` — el
 * backend lo gatea con `manage_plans_and_templates`, que ya era solo super_admin.
 *
 * El GET va por `adminFetch` como el resto del backoffice. El POST va por `proxyMutation`
 * porque el backend responde 409 con "Ya existe un plan con el código 'X'", que es
 * exactamente lo que el operador necesita leer para corregir — `adminFetch` lo
 * convertiría en `"POST /admin/plans -> 409"`.
 */
export async function GET() {
  return NextResponse.json(await adminFetch('/admin/plans'));
}

export async function POST(request: NextRequest) {
  const { accessToken } = await requireSession();
  // Sin `X-Company-Id`: el namespace admin no es tenant-scoped, se gatea con la tabla
  // `staff` (ver `lib/api/admin.ts`).
  return proxyMutation('/admin/plans', {
    accessToken,
    method: 'POST',
    body: await request.text(),
  });
}
