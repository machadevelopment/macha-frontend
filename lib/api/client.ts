import 'server-only';
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, locales, type Locale } from '@/lib/i18n/config';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * El idioma que la pantalla está mostrando AHORA, para que el backend escriba en ese.
 *
 * ═══ POR QUÉ VA EN CADA PETICIÓN Y NO SOLO EN EL SELECTOR (CU-868ku6pp9) ═══
 *
 * Jose reportó la plataforma entera en inglés generando reportes en español. La causa es la
 * política de `lib/i18n/persist-locale.ts`, que está bien pensada y documentada: si el
 * `PUT /me/locale` del selector falla por algo transitorio, el fallo se traga para que la
 * interfaz igual cambie de idioma. La consecuencia es que la cookie (lo que el usuario ve) y
 * `users.locale` (lo que el backend usa para escribir) pueden quedar desincronizados en
 * silencio y de forma indefinida.
 *
 * Reintentar ese PUT no arregla la clase de bug: siempre puede fallar la última vez. Lo que sí
 * la arregla es que el idioma visible viaje en TODA petición, y que el backend lo tome como la
 * señal fresca y corrija lo guardado (ver `lib/content-locale.ts` del backend). El sistema se
 * sana solo en la siguiente cosa que el usuario pida.
 *
 * Va acá, en el cliente de API, y no en cada ruta a propósito: son más de cuarenta rutas del
 * BFF y la que se olvide de mandarlo reintroduce el bug justo en su pantalla. Acá no hay nada
 * que recordar.
 */
function localeVisible(): Locale | null {
  try {
    const raw = cookies().get(LOCALE_COOKIE)?.value;
    return locales.includes(raw as Locale) ? (raw as Locale) : null;
  } catch {
    /*
     * `cookies()` lanza fuera del contexto de una request (un job, un test que importa este
     * módulo sin fingir `next/headers`). No hay idioma visible que reportar y el backend cae a
     * su cadena de siempre — nunca vale tumbar la petición por esto.
     */
    return null;
  }
}

// Definidos en `api-error.ts` (sin `server-only`) para poder probarlos; se reexportan acá
// porque este sigue siendo el punto de entrada del cliente de API del servidor.
export { ApiError, classifyApiFailure } from '@/lib/api/api-error';

import { ApiError } from '@/lib/api/api-error';

/**
 * Wrapper de fetch hacia macha-backend. `companyId` es únicamente la preferencia
 * de UI (cookie `macha-company-id`, Parte C del org-switcher) — el backend es la
 * única autoridad: `tenant.derive.ts` rechaza cualquier X-Company-Id que no sea
 * una membresía real del usuario autenticado (ver CLAUDE.md: company_id nunca se
 * confía desde el cliente).
 */
export async function apiFetch<T>(
  path: string,
  { accessToken, companyId, ...init }: RequestInit & { accessToken: string; companyId?: string },
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (companyId) headers.set('X-Company-Id', companyId);
  // Ver `localeVisible()`: el idioma de la pantalla, para que el contenido que genera la IA
  // salga en el mismo y para que el backend corrija su copia si divergió.
  const locale = localeVisible();
  if (locale) headers.set('X-Content-Locale', locale);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    throw new ApiError(res.status, `${init.method ?? 'GET'} ${path} -> ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Same auth wiring as apiFetch, but returns the raw Response — for binary passthrough (file downloads) where callers must not force a JSON parse. */
export async function apiFetchRaw(
  path: string,
  { accessToken, companyId, ...init }: RequestInit & { accessToken: string; companyId?: string },
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (companyId) headers.set('X-Company-Id', companyId);
  // Ver `localeVisible()`: el idioma de la pantalla, para que el contenido que genera la IA
  // salga en el mismo y para que el backend corrija su copia si divergió.
  const locale = localeVisible();
  if (locale) headers.set('X-Content-Locale', locale);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    throw new ApiError(res.status, `${init.method ?? 'GET'} ${path} -> ${res.status}`);
  }
  return res;
}
