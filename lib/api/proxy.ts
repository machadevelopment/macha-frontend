import 'server-only';
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * CU-868kh8pwv — reenvío de una mutación al backend CONSERVANDO su cuerpo de error.
 *
 * Por qué no usa `apiFetch`/`apiFetchRaw`: las dos lanzan `ApiError` en cuanto la
 * respuesta no es 2xx, y su `message` es `"POST /ruta -> 409"`. Las rutas BFF que las
 * usan responden ese texto y **pierden el mensaje real del backend**. Para casi toda
 * pantalla da igual, el status basta. Para gestión de miembros no: ahí los rechazos son
 * invariantes de negocio, y el mensaje ES la instrucción de qué hacer.
 *
 *   · "La empresa quedaría sin ningún owner activo. Promueve antes a otro miembro…"
 *   · "Cambiar el rol del owner es parte de una transferencia de propiedad…"
 *   · "Ya hay una invitación pendiente para ese correo."
 *
 * Sustituir eso por un "algo salió mal" genérico deja al owner sin saber por qué no
 * puede hacer lo que intenta — justo la fricción que este ticket vino a quitar.
 *
 * Reenvía status y cuerpo tal cual, sin inventar ni traducir: el backend ya responde en
 * el idioma del producto y es la única autoridad sobre la regla. El token se adjunta
 * aquí, server-side, igual que en `lib/api/client.ts`; nunca viaja al navegador.
 */
export async function proxyMutation(
  path: string,
  opts: { accessToken: string; companyId?: string; method: string; body?: string },
): Promise<NextResponse> {
  const headers = new Headers({ Authorization: `Bearer ${opts.accessToken}` });
  if (opts.companyId) headers.set('X-Company-Id', opts.companyId);
  if (opts.body !== undefined) headers.set('Content-Type', 'application/json');

  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method,
    headers,
    ...(opts.body === undefined ? {} : { body: opts.body }),
  });

  // Un backend caído puede responder HTML (502 de proxy) o texto plano (Elysia a veces
  // serializa el Error.message sin JSON). Se traduce a un JSON con la forma que la UI
  // ya sabe leer, en vez de reventar el `res.json()` del navegador — y se PRESERVA el
  // texto cuando lo hay, porque "El servicio respondió 500" sin más no deja depurar.
  const raw = await res.text();
  let payload: unknown;
  if (raw.trim() === '') {
    payload = { error: `El servicio respondió ${res.status}.` };
  } else {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { error: raw.slice(0, 500) };
    }
  }
  return NextResponse.json(payload, { status: res.status });
}
