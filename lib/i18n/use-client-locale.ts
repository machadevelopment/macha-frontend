'use client';

import { defaultLocale, locales, LOCALE_COOKIE, type Locale } from '@/lib/i18n/config';

/**
 * CU-868kkgb8f: idioma para los boundaries de error, leído del cookie en el cliente.
 *
 * `getLocale()` de `lib/i18n/server.ts` no sirve acá: es `server-only` y lanza al
 * importarse desde un componente cliente, y un `error.tsx` es cliente por definición
 * (necesita `reset`). Tampoco se puede recibir por props: React no pasa props a un
 * boundary.
 *
 * `app/global-error.tsx` tiene una copia de esto a propósito y no lo importa: es el
 * manejador de último recurso y su comentario de cabecera justifica que no dependa de
 * ningún módulo que pueda fallar al cargarse. Duplicar ocho líneas ahí es más barato que
 * arriesgar que la pantalla de "todo se rompió" se rompa.
 */
export function useClientLocale(): Locale {
  // En el render de servidor de estos boundaries no hay `document`; se cae al idioma por
  // defecto y se corrige al montar. Un parpadeo de idioma pesa menos que una excepción
  // dentro del manejador de excepciones.
  if (typeof document === 'undefined') return defaultLocale;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  const value = match?.[1];
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale;
}
