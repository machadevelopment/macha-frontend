'use server';

import { cookies } from 'next/headers';
// `LOCALE_COOKIE` desde `config` y no desde `server`: son la misma constante —`server` la
// reexporta— pero `server.ts` importa `server-only`. Ver la nota de `lib/i18n/server.ts`.
import { locales, LOCALE_COOKIE, type Locale } from '@/lib/i18n/config';
import { avisarIdiomaAlServidor } from '@/lib/i18n/persist-locale';
import { apiFetch } from '@/lib/api/client';
import { getOptionalSession } from '@/lib/auth/session';

/**
 * Persiste el idioma elegido (CU-868kfva78), en los DOS lados.
 *
 * ═══ POR QUÉ SON DOS Y NO UNO (CU-868krvuct) ═══
 *
 * Esto solo escribía la cookie, y la cookie solo la lee el frontend. El backend nunca se
 * enteraba de que el usuario había cambiado de idioma — así que el contenido que genera la
 * IA (la narrativa de un reporte, las respuestas del asesor) se escribía en
 * `companies.locale`, fijado una vez en el registro y no editable desde ninguna pantalla.
 *
 * El síntoma que reportó Macha: plataforma en español, reporte generado en inglés. La
 * interfaz cambiaba y el contenido no, porque eran dos fuentes distintas y solo una
 * escuchaba el selector.
 *
 * Cada lado sigue existiendo por su cuenta y ninguno reemplaza al otro:
 *   · La COOKIE es lo que hace que la página siguiente ya se pinte en el idioma nuevo, sin
 *     esperar a nadie. Es lo que el usuario percibe como "el cambio fue inmediato".
 *   · La BASE es lo que sabe el backend cuando genera un reporte minutos después, en un
 *     worker que no tiene ni petición ni cookies.
 *
 * La cookie va PRIMERO: la política de qué pasa si el backend falla —y por qué no se
 * propaga— vive en `lib/i18n/persist-locale.ts`, junto a su explicación y sus tests.
 */
export async function setLocale(locale: Locale) {
  if (!locales.includes(locale)) return;

  cookies().set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
  });

  const { accessToken } = await getOptionalSession();
  await avisarIdiomaAlServidor(locale, accessToken, (elegido, token) =>
    apiFetch('/me/locale', {
      method: 'PUT',
      accessToken: token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: elegido }),
    }),
  );
}
