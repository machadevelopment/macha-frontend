import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { proxyMutation } from '@/lib/api/proxy';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';
import type { InventoryResponse } from '@/lib/api/dashboard';

export async function GET() {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  const data = await apiFetch<InventoryResponse>('/inventory/', { accessToken, companyId });
  return NextResponse.json(data);
}

// `proxyMutation` y no `apiFetch`: el backend rechaza con mensajes que SON la instrucción
// de qué hacer ("Ya existe un artículo con el SKU CAFE-500"), y apiFetch los sustituiría
// por un "POST /inventory -> 400" que no le dice nada a quien está capturando.
export async function POST(request: Request) {
  const { accessToken } = await requireSession();
  const companyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  return proxyMutation('/inventory/', {
    accessToken,
    companyId,
    method: 'POST',
    body: await request.text(),
  });
}
