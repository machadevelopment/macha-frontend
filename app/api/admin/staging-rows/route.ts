import { NextRequest, NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api/admin';
import { paginationSuffix } from '@/lib/api/pagination';

/**
 * CU-868kkgbtv: pasa por `paginationSuffix()` como el resto de las rutas paginadas.
 *
 * Antes reenviaba `request.nextUrl.search` entero al backend — exactamente lo que el
 * comentario de `lib/api/pagination.ts` prohíbe ("solo se reenvían estas dos llaves,
 * nunca la query entera, para que un parámetro inesperado del cliente no llegue al
 * backend por accidente"). Era la única ruta paginada que no seguía la regla.
 *
 * No hay pérdida de funcionalidad: `staging-rows-panel.tsx` solo manda `limit`/`offset`,
 * que es justo lo que `paginationSuffix` deja pasar.
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(await adminFetch(`/admin/staging-rows${paginationSuffix(request)}`));
}
