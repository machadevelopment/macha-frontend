import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';
import type { InventoryMovementsResponse } from '@/lib/api/dashboard';

export async function GET(request: Request) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
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
