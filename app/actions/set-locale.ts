'use server';

import { cookies } from 'next/headers';
import { locales, type Locale } from '@/lib/i18n/config';
import { LOCALE_COOKIE } from '@/lib/i18n/server';

/** Persists the user's locale choice (CU-868kfva78) — mirrors set-active-company.ts. */
export async function setLocale(locale: Locale) {
  if (!locales.includes(locale)) return;
  cookies().set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
  });
}
