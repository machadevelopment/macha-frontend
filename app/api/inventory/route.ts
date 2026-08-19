import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { proxyMutation } from '@/lib/api/proxy';
import { activeCompanyId } from '@/lib/auth/active-company-server';
import type { InventoryResponse } from '@/lib/api/dashboard';

export async function GET() {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  const data = await apiFetch<InventoryResponse>('/inventory/', { accessToken, companyId });
  return NextResponse.json(data);
}

// `proxyMutation` y no `apiFetch`: el backend rechaza con mensajes que SON la instrucción
// de qué hacer ("Ya existe un artículo con el SKU CAFE-500"), y apiFetch los sustituiría
// por un "POST /inventory -> 400" que no le dice nada a quien está capturando.
export async function POST(request: Request) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  return proxyMutation('/inventory/', {
    accessToken,
    companyId,
    method: 'POST',
    body: await request.text(),
  });
}
