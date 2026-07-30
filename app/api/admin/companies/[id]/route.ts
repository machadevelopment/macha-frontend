import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api/admin';

// CU-868khvzqn: detalle de una empresa. El listado está paginado, así que resolver un
// id arbitrario desde el cliente exigiría barrer páginas; el backend expone el detalle.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return NextResponse.json(await adminFetch(`/admin/companies/${params.id}`));
}
