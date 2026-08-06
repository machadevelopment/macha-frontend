import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';
import type { InventoryMovementsResponse } from '@/lib/api/dashboard';

export async function GET(request: Request) {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  const itemId = searchParams.get('itemId');
  if (itemId) qs.set('itemId', itemId);
  qs.set('limit', searchParams.get('limit') ?? '100');

  const data = await apiFetch<InventoryMovementsResponse>(`/inventory/movements?${qs}`, {
    accessToken,
    companyId,
  });
  return NextResponse.json(data);
}
