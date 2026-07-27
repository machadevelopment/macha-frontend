import { NextRequest, NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api/admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } },
) {
  const body = await request.json();
  const data = await adminFetch(`/admin/companies/${params.id}/users/${params.userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return NextResponse.json(data);
}
