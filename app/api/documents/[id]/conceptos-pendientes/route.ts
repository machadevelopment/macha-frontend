import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch, ApiError } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';

/**
 * Proxy BFF de "qué conceptos quedaron sin entender en esta carga".
 *
 * Mismo patrón que el resto de `/api/documents/*`: la autorización real —capacidad del rol y
 * pertenencia del documento a la empresa— la resuelve macha-backend y acá NO se duplica. Lo
 * único que agrega esta capa es el token de sesión y la empresa activa, que el navegador no
 * puede poner por su cuenta.
 *
 * `activeCompanyId(user.id)` y no la cookie cruda: la cookie lleva el userId adentro, y leerla
 * sin comprobarlo hace que el BFF pida los datos de otra empresa.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  try {
    const data = await apiFetch(`/documents/${params.id}/conceptos-pendientes`, {
      accessToken,
      companyId,
    });
    return NextResponse.json(data);
  } catch (err) {
    // Propaga el status real: 404 si el documento no es de esta empresa, 403 sin permiso.
    // Convertirlo en un 500 opaco dejaría al cliente sin saber por qué la pantalla está vacía.
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
