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

    const ya = document.querySelector(`[data-doc="${CSS.escape(destacado)}"]`);
    if (ya) {
      irA(ya);
      return;
    }

    const observador = new MutationObserver(() => {
      const el = document.querySelector(`[data-doc="${CSS.escape(destacado)}"]`);
      if (!el) return;
      observador.disconnect();
      irA(el);
    });
    observador.observe(document.body, { childList: true, subtree: true });
    return () => observador.disconnect();
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
