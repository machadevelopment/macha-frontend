import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { leerCuerpo } from '@/lib/api/json-o-texto';

/**
 * Subida de la plantilla .xlsx descargable de una industria (pedido de Jose, 2026-08-20).
 *
 * `fetch` crudo y no `apiFetch`, por el mismo motivo que la subida de documentos del cliente:
 * los rechazos del backend traen un `{error}` con texto concreto —tipo no soportado, industria
 * vacía— y `apiFetch` los convierte en un `ApiError` que descarta el cuerpo. Quien acaba de
 * elegir un archivo necesita leer por qué no se aceptó, no un "algo falló".
 *
 * El `FormData` se reenvía tal cual: no se reconstruye ni se valida acá. La validación vive en
 * el esquema del backend, que es el que acota tipo y tamaño; repetirla en el borde exterior
 * daría dos reglas que se desincronizan, y la de afuera no es la que protege el bucket.
 */
export async function POST(request: NextRequest, { params }: { params: { industry: string } }) {
  const { accessToken } = await requireSession();
  const formData = await request.formData();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/admin/industry-templates/starters/${encodeURIComponent(
      params.industry,
    )}`,
    { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: formData },
  );
  const data = await leerCuerpo(res);
  return NextResponse.json(data, { status: res.status });
}
