import 'server-only';
import { cookies } from 'next/headers';
import { defaultLocale, locales, type Locale } from './config';

export const LOCALE_COOKIE = 'macha-locale';

function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}

/** Active locale for the current request — cookie set by app/actions/set-locale.ts, falls back to defaultLocale. */
export function getLocale(): Locale {
  const value = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}
