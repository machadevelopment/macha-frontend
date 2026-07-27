import { NextRequest, NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api/admin';

export async function GET(request: NextRequest) {
  const qs = request.nextUrl.search;
  return NextResponse.json(await adminFetch(`/admin/staging-rows${qs}`));
}
