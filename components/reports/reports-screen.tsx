'use client';

import { useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { ReportsHeader } from '@/components/reports/reports-header';
import { ReportBuilder } from '@/components/reports/report-builder';
import { ReportList } from '@/components/reports/report-list';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * Generador + historial (ticket B2).
 *
 * Existe como componente cliente propio para resolver una sola cosa: cuando el generador
 * encola un reporte, el HISTORIAL DE ABAJO tiene que volver a pedirse. Si no, el mensaje
 * "aparecerá abajo" apunta a una lista que no cambió, y el usuario recarga la página para
 * comprobar algo que la pantalla ya podría estar mostrando.
 *
 * La recarga se hace con una `key` que cambia, y no con un `ref` o un callback dentro de
 * `ReportList`: cambiar la `key` remonta el componente, que vuelve a correr su carga
 * inicial y su paginación desde cero. Es exactamente el estado que se quiere —la primera
 * página, recién traída— sin agregarle a `ReportList` una API de refresco que solo usaría
 * este llamador.
 *
 * NO SE HACE POLLING. La generación es asíncrona y podría tardar; un `setInterval` contra
 * el historial gastaría requests de todos los usuarios que dejen la pestaña abierta para
 * cubrir el caso de uno que está esperando. El botón de recarga del navegador ya existe, y
 * el mensaje dice que el reporte va a aparecer, no que ya está.
 */
export function ReportsScreen({
  locale,
  labels,
  periodLabels,
  common,
  canGenerate,
}: {
  locale: Locale;
  labels: Dictionary['reports'];
  periodLabels: Dictionary['dashboard']['period'];
  common: Dictionary['common'];
  canGenerate: boolean;
}) {
  const [nonce, setNonce] = useState(0);

  return (
    <>
      {/* CU-868krvrxy: la cabecera de descarga del prototipo. Va arriba del generador
          porque bajar lo que ya existe es la acción más frecuente; generar uno nuevo
          cuesta créditos y es la excepción. Comparte el `nonce` con el historial: al
          encolar un reporte, las dos piezas se vuelven a mirar.

          CU-868ktkn9w: desde este ticket ES la cabecera de la pantalla —título, subtítulo
          y acciones en una sola fila— y por eso `page.tsx` ya no monta su propio
          `PageHeader`. Ver la nota de `ReportsHeader`. */}
      <ReportsHeader labels={labels} common={common} nonce={nonce} />
      <ReportBuilder
        locale={locale}
        labels={labels.builder}
        periodLabels={periodLabels}
        canGenerate={canGenerate}
        onQueued={() => setNonce((n) => n + 1)}
      />
      {/*
        CU-868ktkn9w — el historial va en su propia tarjeta y con su propio título.

        La tabla colgaba suelta del generador, sin nada que la separara. Leído de corrido,
        lo de abajo parecía la salida de lo que se estaba configurando arriba, cuando es el
        archivo de todo lo ya generado — y el estado vacío ("Todavía no hay reportes
        generados") aparecía como un párrafo huérfano al que nada le daba contexto. El
        prototipo la titula y la encierra, que es lo que hace legible el corte.
      */}
      <Card>
        <CardTitle className="mb-3">{labels.historyTitle}</CardTitle>
        <ReportList key={nonce} locale={locale} labels={labels} common={common} />
      </Card>
    </>
  );
}
