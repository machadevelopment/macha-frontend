export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';

// Locale -> Intl locale tag used by the format helpers.
export const intlLocale: Record<Locale, string> = { es: 'es-GT', en: 'en-US' };
