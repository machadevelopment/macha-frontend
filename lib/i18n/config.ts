export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';

/**
 * Nombre de la cookie que recuerda el idioma. Vive acá y no en `lib/i18n/server.ts`
 * porque ese módulo es `server-only`: importarlo desde un client component lanza en
 * tiempo de import. `app/global-error.tsx` (CU-868kjc99f) necesita el nombre para leer
 * `document.cookie` — no hay contexto de servidor dentro de un boundary de error.
 *
 * Mismo motivo y misma forma que `ACTIVE_COMPANY_COOKIE` en `lib/auth/active-company.ts`.
 * Es solo un nombre de cookie: leerlo no concede nada, y el idioma no es una decisión
 * de seguridad.
 */
export const LOCALE_COOKIE = 'macha-locale';

// Locale -> Intl locale tag used by the format helpers.
export const intlLocale: Record<Locale, string> = { es: 'es-GT', en: 'en-US' };
