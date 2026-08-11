import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';

/**
 * CU-868kkgb8f criterio 3: la pantalla de 404 del producto.
 *
 * No existía, así que el `notFound()` con el que `app/admin/layout.tsx` tapa el backoffice
 * (CU-868kh8xfh) mostraba la página por defecto de Next — un "404 | This page could not be
 * found" en Helvetica, sin tokens, sin idioma y sin salida.
 *
 * Va en la raíz y no en `app/admin/`: cuando el layout de admin llama a `notFound()`, ese
 * layout **no llega a renderizar**, así que un `app/admin/not-found.tsx` quedaría por
 * debajo del que lanzó y no se usaría. Además, tenerlo solo en la raíz es lo que hace que
 * un cliente curioso que escribe `/admin` vea exactamente el mismo 404 que en cualquier
 * URL inventada — que es el punto del gate.
 *
 * Por eso el texto es deliberadamente genérico: nada de "no tienes permiso" ni de "sección
 * restringida". Cualquiera de las dos confirmaría que `/admin` existe.
 *
 * Tampoco monta el `AppShell`: el 404 tiene que servirle igual a un visitante sin sesión,
 * y el shell exige una.
 */
export default function NotFound() {
  const locale = getLocale();
  const t = getDictionary(locale).common;

  return (
    <main
      data-density="comfortable"
      className="mx-auto flex min-h-dvh max-w-app flex-col items-start justify-center gap-3 p-[var(--density-main-p)]"
    >
      <p className="font-mono text-eyebrow uppercase text-faint">404</p>
      <h1 className="text-h1">{t.notFound.title}</h1>
      <p className="text-body text-muted-foreground">{t.notFound.body}</p>
      <a href="/" className="text-body underline">
        {t.notFound.cta}
      </a>
    </main>
  );
}
