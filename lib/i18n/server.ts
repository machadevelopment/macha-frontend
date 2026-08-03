import 'server-only';
import { cookies } from 'next/headers';
import { defaultLocale, locales, LOCALE_COOKIE, type Locale } from './config';

// CU-868kjc99f: la constante se mudó a `./config` (módulo sin `server-only`) para que
// `app/global-error.tsx`, que es client component, pueda leer la cookie. Se re-exporta
// desde acá para no romper a quien ya la importaba de este módulo.
export { LOCALE_COOKIE };

function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}

/** Active locale for the current request — cookie set by app/actions/set-locale.ts, falls back to defaultLocale. */
export function getLocale(): Locale {
  const value = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}
