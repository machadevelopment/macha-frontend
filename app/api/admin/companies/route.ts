import { NextRequest, NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api/admin';
import { paginationSuffix } from '@/lib/api/pagination';

// CU-868kh913c: reenvía limit/offset para el "load more" — sin esto el panel
// quedaría clavado en la primera página del backend.
export async function GET(request: NextRequest) {
  return NextResponse.json(await adminFetch(`/admin/companies${paginationSuffix(request)}`));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const data = await adminFetch('/admin/companies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return NextResponse.json(data);
}
