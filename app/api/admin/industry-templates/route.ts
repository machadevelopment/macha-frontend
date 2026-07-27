import { NextRequest, NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api/admin';

export async function GET() {
  return NextResponse.json(await adminFetch('/admin/industry-templates'));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const data = await adminFetch('/admin/industry-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return NextResponse.json(data);
}
