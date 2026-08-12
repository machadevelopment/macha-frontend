'use client';

import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { sfPro, mono } from '@/lib/fonts';
import { defaultLocale, locales, LOCALE_COOKIE, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { ShowcaseFrame, ShowcaseHeading, showcaseCta } from '@/components/ui/showcase';
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

/**
 * CU-868knx0vh — EL MODO OSCURO DE ESTA PANTALLA NO EXISTÍA, y no era un olvido de estilos:
 * es estructural. `global-error` reemplaza al layout raíz, así que rinde su propio `<html>`
 * SIN el `ThemeProvider` — y los tokens oscuros viven en `.dark`, una clase que aquí nadie
 * pone. Resultado: a un usuario con tema oscuro la aplicación se le rompía y encima le
 * pegaba un flash blanco.
 *
 * Se resuelve leyendo el tema en el INICIALIZADOR de `useState`, que corre durante el
 * primer render, antes de que React reconcilie el `className` del `<html>` real: en el caso
 * que de verdad importa —un error del árbol de React ya montado, que es lo que este
 * boundary captura— la clase que `next-themes` había puesto todavía está en el DOM y se
 * conserva. Si no está (error renderizado en servidor), se cae a la preferencia del
 * sistema.
 *
 * No se lee `localStorage` a propósito: es donde `next-themes` guarda la elección, pero
 * puede lanzar (Safari en privado, cookies bloqueadas) y esto es el manejador de errores de
 * último recurso. Consecuencia aceptada: quien forzó tema claro con el sistema en oscuro y
 * llega acá por un error de SERVIDOR ve esta pantalla oscura. Es una pantalla, y la
 * alternativa es arriesgar una excepción dentro del propio manejador de excepciones.
 */
function usePrefersDark(): boolean {
  const [dark] = useState(() => {
    if (typeof document === 'undefined') return false;
    if (document.documentElement.classList.contains('dark')) return true;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });
  return dark;
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
  const dark = usePrefersDark();
  const t = getDictionary(locale).common;

  return (
    /*
     * `suppressHydrationWarning` por la clase de tema: el servidor no sabe qué tema tiene
     * el usuario y el cliente sí (ver `usePrefersDark`), así que el `className` difiere a
     * propósito. Es la misma razón por la que lo lleva `app/layout.tsx`.
     */
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${sfPro.variable} ${mono.variable} ${dark ? 'dark' : ''}`}
    >
      <body>
        {/*
          CU-868knx0vh — VITRINA. Esta pantalla es la peor cara del producto y, hasta hoy,
          también la más pobre: texto pelado sin marca, alineado a la izquierda. Un fallo
          total presentado con la identidad puesta se lee como "el producto sabe que se
          rompió"; el mismo fallo en texto crudo se lee como que no hay nadie del otro lado.

          `ShowcaseFrame` y `ShowcaseHeading` son marcado y tokens, sin estado ni datos:
          cumplen la regla de este archivo de no importar nada que pueda fallar dentro del
          manejador de errores. El `<button>` sigue siendo plano por lo mismo.
        */}
        <ShowcaseFrame className="min-h-dvh">
          <main
            data-density="comfortable"
            className="mx-auto flex min-h-dvh max-w-[720px] flex-col items-center justify-center gap-6 p-[var(--density-main-p)]"
          >
            <ShowcaseHeading
              eyebrow="Macha Finance"
              title={t.error.title}
              subtitle={t.error.body}
            />

            {/*
              `digest` es el identificador que Next asigna al error y el mismo que queda en
              el evento de Sentry: es lo único que convierte un reporte de usuario ("se me
              rompió") en algo buscable. Va en mono porque es un ID (regla de tipografía).
            */}
            {error.digest && (
              <p className="font-mono text-eyebrow uppercase text-faint">{error.digest}</p>
            )}

            {/* `<button>` plano y no el `Button` de shadcn: un import menos que pueda
                fallar dentro del manejador de errores. Las clases son las mismas del CTA de
                vitrina, que por eso son una constante y no un componente. */}
            <button type="button" onClick={reset} className={showcaseCta}>
              {t.error.retry}
            </button>
          </main>
        </ShowcaseFrame>
      </body>
    </html>
  );
}
