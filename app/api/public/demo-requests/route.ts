import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

/**
 * BFF público del formulario de demo.
 *
 * Sin sesión a propósito: quien llena el formulario todavía no es cliente. No usa `apiFetch`
 * (exige Bearer). Reenvía `x-forwarded-for` / `x-real-ip` para que el freno por origen del
 * backend vea la IP del visitante y no la del edge de Vercel.
 */
export async function POST(req: Request) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return NextResponse.json({ error: 'API URL not configured' }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const h = headers();
  const forwarded = h.get('x-forwarded-for');
  const realIp = h.get('x-real-ip');

  const upstream = await fetch(`${apiUrl.replace(/\/$/, '')}/public/demo-requests`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(forwarded ? { 'x-forwarded-for': forwarded } : {}),
      ...(realIp ? { 'x-real-ip': realIp } : {}),
    },
    body: JSON.stringify(body),
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
    },
  });
}
