import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api/admin';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return NextResponse.json(await adminFetch(`/admin/companies/${params.id}/alert-rules`));
}
