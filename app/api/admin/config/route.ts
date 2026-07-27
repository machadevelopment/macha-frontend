import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api/admin';

export async function GET() {
  return NextResponse.json(await adminFetch('/admin/config'));
}
