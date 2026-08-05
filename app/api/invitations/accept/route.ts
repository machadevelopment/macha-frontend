import { requireSession } from '@/lib/auth/session';
import { proxyMutation } from '@/lib/api/proxy';

/**
 * CU-868kh8pwv. SIN `X-Company-Id`, a diferencia del resto de proxies: quien acepta
 * todavía no es miembro de ninguna empresa, así que la cookie de empresa activa o está
 * vacía o —peor— apunta a otra empresa suya y el backend la usaría para scopear. La
 * empresa sale del token de la invitación, que es la única autoridad aquí.
 */
export async function POST(req: Request) {
  const { accessToken } = await requireSession();
  return proxyMutation('/invitations/accept', {
    accessToken,
    method: 'POST',
    body: await req.text(),
  });
}
