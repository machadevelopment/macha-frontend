import { NextRequest, NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api/admin';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return NextResponse.json(await adminFetch(`/admin/industry-templates/${params.id}/versions`));
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const data = await adminFetch(`/admin/industry-templates/${params.id}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return NextResponse.json(data);
}
