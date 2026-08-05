import { requireSession } from '@/lib/auth/session';
import { proxyMutation } from '@/lib/api/proxy';

// BFF proxy (CU-868kfvae1): the wizard client component can't hold the WorkOS
// access token — this route runs server-side, attaches it, and forwards to
// macha-backend's POST /register. No X-Company-Id: the caller has no company
// yet, that's exactly what this endpoint creates (identityDerive, not tenantDerive).
//
// CU-868kmxu41: usa `proxyMutation` y ya no `apiFetch`. `apiFetch` lanza `ApiError`
// cuyo `message` es `"POST /register -> 503"`, así que esta ruta respondía ese texto y
// **perdía el mensaje del backend**. El formulario caía entonces a su genérico "No se
// pudo completar el registro. Intenta de nuevo." — que ante un fallo de configuración
// es una instrucción falsa: la persona reintenta contra un muro. Con el cuerpo real,
// lee "El registro no está disponible en este momento. Escríbenos y te damos de alta."
export async function POST(request: Request) {
  const { accessToken } = await requireSession();
  return proxyMutation('/register', {
    accessToken,
    method: 'POST',
    body: await request.text(),
  });
}
