import { NextRequest, NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api/admin';
import { paginationSuffix } from '@/lib/api/pagination';

/** BFF del listado de solicitudes de demo (staff). */
export async function GET(request: NextRequest) {
  return NextResponse.json(await adminFetch(`/admin/demo-requests${paginationSuffix(request)}`));
}
