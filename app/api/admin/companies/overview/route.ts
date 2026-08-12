import { NextRequest, NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api/admin';
import { paginationSuffix } from '@/lib/api/pagination';

/**
 * Ticket B5 — vista consolidada de empresas del backoffice.
 *
 * Reenvía a `GET /admin/companies/overview`, que devuelve el listado de empresas YA
 * cruzado con plan, saldo de créditos, costo de IA acumulado y tokens. Reemplaza a
 * `/api/admin/companies` como fuente del panel: la alternativa era pedir el listado y
 * después el saldo empresa por empresa desde el navegador.
 *
 * Se reenvían `limit`/`offset` por la misma razón que en `/api/admin/companies`
 * (CU-868kh913c): sin eso el "cargar más" quedaría clavado en la primera página.
 *
 * Va en `overview/` y no en `[id]/`: Next resuelve el segmento estático antes que el
 * dinámico, así que `/api/admin/companies/overview` no cae en la ruta de detalle.
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    await adminFetch(`/admin/companies/overview${paginationSuffix(request)}`),
  );
}
