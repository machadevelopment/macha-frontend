import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api/admin';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const data = await adminFetch(`/admin/staging-rows/${params.id}/reextract`, { method: 'POST' });
  return NextResponse.json(data);
}
