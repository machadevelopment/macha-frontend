'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DocumentDropzone } from '@/components/upload/document-dropzone';
import { DocumentList } from '@/components/upload/document-list';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

export function UploadScreen({
  locale,
  labels,
  common,
  canRevert,
  destacado,
}: {
  locale: Locale;
  labels: Dictionary['upload'];
  common: Dictionary['common'];
  canRevert: boolean;
  /** El documento del `?doc=` del correo o del banner. Ver `app/(app)/upload/page.tsx`. */
  destacado?: string;
}) {
  const [refreshToken, setRefreshToken] = useState(0);

  /*
   * SCROLL hasta la fila destacada.
   *
   * Va acá y no en la fila porque la lista se carga por `fetch` después del primer render: al
   * montarse esta pantalla la fila todavía no existe en el DOM. El `MutationObserver` espera a
   * que aparezca y se desconecta al primer acierto — un `setTimeout` adivinaría cuánto tarda la
   * petición, y adivinar mal significa no hacer scroll o hacerlo a destiempo.
   *
   * `block: 'center'` y no `'start'`: el panel de preguntas se abre DEBAJO de la fila, así que
   * dejarla pegada al borde superior mostraría la fila y escondería la pregunta, que es lo que
   * el cliente vino a contestar.
   *
   * Respeta `prefers-reduced-motion`: un salto suave largo es exactamente lo que molesta a
   * quien pidió que el sistema no anime.
   */
  useEffect(() => {
    if (!destacado) return;
    const suave = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const irA = (el: Element) =>
      el.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'center' });

    /*
     * ⚠️ UN SOLO SCROLL NO ALCANZA, y así estuvo en producción. Medido el 2026-09-01 con el
     * enlace del correo: la fila aparecía a los ~375 ms midiendo 152 px, se llamaba
     * `scrollIntoView`, y `scrollY` se quedaba en **0** — con el panel cerrado el documento
     * apenas pasa el alto de la ventana, así que no hay a dónde scrollear. Un segundo después
     * el panel de preguntas se abre solo, la fila pasa a 716 px, el documento a 1473, y ahí sí
     * había 549 px de scroll disponible que nadie volvía a pedir. Resultado: la fila quedaba
     * resaltada abajo del pliegue y la pregunta —lo único que el cliente vino a contestar—
     * fuera de la vista. Nada falla, que es el patrón de esta pantalla.
     *
     * Así que se RE-AFIRMA mientras la fila CREZCA (`ResizeObserver`), no una vez y listo. Se
     * deja de insistir en cuanto deja de crecer, y también si el cliente scrollea por su
     * cuenta: recuperar la posición de alguien que decidió mirar otra cosa es peor que no
     * haber hecho scroll nunca. Es la misma pieza del deep link, ahora ejecutada cuando el
     * layout ya existe.
     */
    let cancelado = false;
    let observadorDeTamano: ResizeObserver | undefined;
    let ultimoAlto = -1;

    const soltar = () => {
      cancelado = true;
      observadorDeTamano?.disconnect();
    };
    // Cualquier gesto de scroll del cliente gana. `scroll` a secas no sirve: lo emite el
    // propio `scrollIntoView`.
    const GESTOS = ['wheel', 'touchstart', 'keydown'] as const;
    GESTOS.forEach((g) => window.addEventListener(g, soltar, { passive: true, once: true }));

    const seguir = (el: Element) => {
      irA(el);
      if (typeof ResizeObserver === 'undefined') return;
      observadorDeTamano = new ResizeObserver(() => {
        if (cancelado) return;
        const alto = el.getBoundingClientRect().height;
        if (alto <= ultimoAlto) {
          observadorDeTamano?.disconnect();
          return;
        }
        ultimoAlto = alto;
        irA(el);
      });
      observadorDeTamano.observe(el);
    };

    const ya = document.querySelector(`[data-doc="${CSS.escape(destacado)}"]`);
    if (ya) {
      seguir(ya);
      return () => {
        soltar();
        GESTOS.forEach((g) => window.removeEventListener(g, soltar));
      };
    }

    const observador = new MutationObserver(() => {
      const el = document.querySelector(`[data-doc="${CSS.escape(destacado)}"]`);
      if (!el) return;
      observador.disconnect();
      seguir(el);
    });
    observador.observe(document.body, { childList: true, subtree: true });
    return () => {
      observador.disconnect();
      soltar();
      GESTOS.forEach((g) => window.removeEventListener(g, soltar));
    };
  }, [destacado]);

  return (
    <div className="flex flex-col gap-4">
      <DocumentDropzone
        labels={labels}
        common={common}
        onUploaded={() => setRefreshToken((n) => n + 1)}
      />
      <div className="flex flex-col gap-1.5">
        <a href="/api/industry-templates/download" className="self-start">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" strokeWidth={1.7} />
            {labels.downloadTemplate}
          </Button>
        </a>
        <p className="text-body text-muted-foreground">{labels.downloadTemplateHint}</p>
      </div>
      <Card>
        <DocumentList
          locale={locale}
          labels={labels}
          common={common}
          refreshToken={refreshToken}
          canRevert={canRevert}
          destacado={destacado}
        />
      </Card>
    </div>
  );
}
