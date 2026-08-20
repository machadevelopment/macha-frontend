import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch, ApiError } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';

/**
 * Proxy BFF de la RESPUESTA del cliente: qué es cada concepto que el sistema no entendió.
 *
 * El cuerpo se reenvía tal cual, sin validarlo acá. No es descuido: la validación vive en el
 * esquema TypeBox del backend, que es el que acota `type` a los cuatro válidos. Repetirla acá
 * daría dos reglas que se desincronizan, y la del borde exterior no es la que protege la base.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);
  try {
    const data = await apiFetch(`/documents/${params.id}/conceptos`, {
      method: 'POST',
      accessToken,
      companyId,
      body: JSON.stringify(await request.json()),
      headers: { 'Content-Type': 'application/json' },
    });
    return NextResponse.json(data);
  } catch (err) {
    // 422 cuando el `type` no es válido, 404 si el documento no es de esta empresa. El cliente
    // acaba de contestar un formulario: tiene que ver qué pasó, no un error genérico.
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
