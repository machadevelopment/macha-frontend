import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { ShowcaseFrame, ShowcaseHeading, showcaseCta } from '@/components/ui/showcase';

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
 *
 * CU-868knx0vh — VITRINA. Un 404 no es una pantalla de producto: la alcanza cualquiera,
 * incluido quien todavía no es cliente y quien recibió un link viejo. Era texto pelado
 * alineado a la izquierda, así que se le da el mismo marco de marca que a `/` y al
 * registro. El "404" se queda como eyebrow —es un código, va en mono— y el mensaje sigue
 * siendo deliberadamente genérico por la razón de arriba.
 */
export default function NotFound() {
  const locale = getLocale();
  const t = getDictionary(locale).common;

  return (
    <ShowcaseFrame className="min-h-dvh">
      <main
        data-density="comfortable"
        className="mx-auto flex min-h-dvh max-w-[720px] flex-col items-center justify-center gap-6 p-[var(--density-main-p)]"
      >
        <ShowcaseHeading eyebrow="404" title={t.notFound.title} subtitle={t.notFound.body} />
        <a href="/" className={showcaseCta}>
          {t.notFound.cta}
        </a>
      </main>
    </ShowcaseFrame>
  );
}
