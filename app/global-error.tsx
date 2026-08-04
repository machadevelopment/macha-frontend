'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { inter, mono } from '@/lib/fonts';
import { defaultLocale, locales, LOCALE_COOKIE, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import '@/styles/globals.css';

/**
 * CU-868kjc99f: sin este archivo, un error de renderizado de React en el App Router
 * **no llega a Sentry**. Lo avisa el propio SDK durante el build ("It seems like you
 * don't have a global error handler set up"): la instrumentación automática cubre
 * route handlers y Server Components, pero el árbol de React que se cae del lado del
 * cliente solo lo captura un `global-error`. Es justo el fallo más visible para el
 * usuario y el que quedaba sin reportar.
 *
 * Reemplaza al `app/layout.tsx` entero cuando se activa —por eso rinde su propio
 * `<html>`/`<body>`, importa los tokens y ata las variables de fuente a mano—, y por
 * eso mismo **no puede depender de nada que pueda fallar**: ni de `AuthKitProvider`, ni
 * de una llamada al backend, ni de `next-themes`. Si esta pantalla lanza, el usuario ve
 * la pantalla de error cruda de Next.
 *
 * El idioma se lee de `document.cookie` y no del servidor: aquí no hay contexto de
 * request. Por eso `LOCALE_COOKIE` tuvo que salir de `lib/i18n/server.ts` (que es
 * `server-only` y lanza al importarse desde el cliente) hacia `lib/i18n/config.ts`.
 */
function useLocale(): Locale {
  // `document` no existe en el render de servidor de este boundary; se resuelve el
  // idioma tras montar y hasta entonces se usa el default. Un parpadeo de idioma en la
  // pantalla de error pesa menos que arriesgar una excepción dentro del propio
  // manejador de excepciones.
  if (typeof document === 'undefined') return defaultLocale;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  const value = match?.[1];
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale;
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const locale = useLocale();
  const t = getDictionary(locale).common;

  return (
    <html lang={locale} className={`${inter.variable} ${mono.variable}`}>
      <body>
        <main
          data-density="comfortable"
          className="mx-auto flex min-h-screen max-w-app flex-col items-start justify-center gap-3 p-[var(--density-main-p)]"
        >
          <p className="font-mono text-eyebrow uppercase text-faint">Macha Finance</p>
          <h1 className="text-h1">{t.error.title}</h1>
          <p className="text-body text-muted-foreground">{t.error.body}</p>

          {/*
            `digest` es el identificador que Next asigna al error y el mismo que queda en
            el evento de Sentry: es lo único que convierte un reporte de usuario ("se me
            rompió") en algo buscable. Va en mono porque es un ID (regla de tipografía).
          */}
          {error.digest && (
            <p className="font-mono text-eyebrow uppercase text-faint">{error.digest}</p>
          )}

          {/* `<button>` plano y no el `Button` de shadcn: un import menos que pueda
              fallar dentro del manejador de errores. */}
          <button
            type="button"
            onClick={reset}
            className="rounded-[7px] border border-border px-3 py-1.5 text-body text-foreground transition-colors hover:bg-muted"
          >
            {t.error.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
