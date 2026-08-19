'use client';

import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { request } from '@/lib/api/browser';
import { descargarArchivo, nombreDeReporte } from '@/lib/download';
import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * Cabecera de descarga de Reportes — CU-868krvrxy.
 *
 * ═══ QUÉ PEDÍA EL PROTOTIPO, Y QUÉ SE PUEDE ENTREGAR HOY ═══
 *
 * El prototipo de Lovable abre la pantalla con dos botones —"Descargar Excel" y "Descargar
 * PDF"— y una tarjeta que dice *"Descarga un resumen consolidado de ventas, gastos, utilidad
 * y margen en formato PDF o Excel"*.
 *
 * Eso describe un **export directo de los datos**: sin IA, sin créditos, sin esperar. **Ese
 * endpoint no existe.** Lo que el backend sabe exportar es una VERSIÓN DE REPORTE ya
 * generada (`/reports/:id/export/pdf|xlsx`), que es otra cosa: la produce Claude, cuesta
 * créditos y tarda.
 *
 * Se podía hacer una de dos:
 *
 *   · poner los botones con el texto del prototipo y que bajen el último reporte de IA —
 *     que es **mentirle al usuario** sobre qué está descargando;
 *   · poner los botones haciendo lo que de verdad hacen, y decirlo.
 *
 * Va la segunda. Los botones bajan **el último reporte generado** y el texto lo dice con
 * esas palabras. El export directo de datos queda anotado en el ticket como una decisión
 * para Jose: es trabajo de backend y de otro tamaño.
 *
 * ═══ NO SE MUESTRA UN BOTÓN MUERTO ═══
 *
 * Si la empresa todavía no generó ningún reporte, no hay nada que bajar. En vez de dos
 * botones que fallan al tocarlos, se muestra la frase que dice qué hacer primero. Un
 * control deshabilitado sin explicación es la versión educada del mismo problema.
 *
 * `ready` es el campo que agregó CU-868krw2wn: un reporte cuya generación falló existe en
 * la lista pero no tiene contenido, y ofrecer su descarga daría un error en vez de un
 * archivo.
 *
 * ═══ CU-868ktkn9w — ESTO **ES** LA CABECERA DE LA PANTALLA, NO UNA TARJETA MÁS ═══
 *
 * Hasta este ticket eran dos bloques apilados: el `PageHeader` de la página (solo el
 * título) y, debajo, una tarjeta entera dedicada a "Descargar tu último reporte". El
 * prototipo no tiene esa tarjeta: pone las descargas **en la misma fila del título**, al
 * extremo derecho, que es exactamente el hueco para el que `PageHeader` declara su prop
 * `actions` — y que hasta hoy ninguna pantalla usaba. Se recupera una tarjeta de alto en
 * la parte más cara del dashboard sin perder una sola palabra del texto.
 *
 * El texto explicativo NO se pierde ni se vuelve estático: baja al subtítulo del
 * `PageHeader` y sigue teniendo sus dos versiones, porque el matiz que defiende (lo que
 * baja es el ÚLTIMO REPORTE GENERADO, no un export de datos en crudo) es justo lo que se
 * perdería al reducirlo a dos botones sueltos. Por eso la cabecera se renderiza acá,
 * dentro del árbol cliente, y no en `page.tsx`: la frase depende de si hay algo que bajar,
 * y eso solo se sabe después del fetch.
 *
 * Mientras carga NO se muestra ninguna de las dos frases. Enseñar "genera un reporte
 * abajo" a quien tiene doscientos —aunque sea por 200 ms— es decirle algo falso; el
 * subtítulo aparece cuando hay una respuesta que dar.
 */

interface ReportRow {
  id: string;
  ready?: boolean;
}

export function ReportsHeader({
  labels,
  common,
  /** Cambia cuando se encola un reporte nuevo: obliga a volver a buscar el último. */
  nonce,
}: {
  labels: Dictionary['reports'];
  common: Dictionary['common'];
  nonce: number;
}) {
  /**
   * `undefined` = todavía no se sabe (no se afirma nada); `null` = no hay nada que bajar.
   * La distinción es la que evita afirmar "no tienes reportes" durante el primer fetch.
   */
  const [ultimo, setUltimo] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /*
     * `limit=2` y no 1: el más reciente puede ser justo el que acaba de encolarse y todavía
     * no tiene contenido. Con dos, el segundo suele ser uno descargable y el botón no
     * desaparece cada vez que el usuario genera algo.
     */
    void request<{ reports: ReportRow[] }>('/api/reports?limit=2&offset=0').then((r) => {
      if (!r.ok) return; // Sin lista, la cabecera simplemente no ofrece descarga.
      setUltimo(r.data.reports.find((x) => x.ready !== false)?.id ?? null);
    });
  }, [nonce]);

  async function bajar(formato: 'pdf' | 'xlsx') {
    if (!ultimo) return;
    setError(null);
    const r = await request<{ url: string }>(`/api/reports/${ultimo}/export/${formato}`);
    if (!r.ok) {
      setError(common.loadError.server);
      return;
    }
    // CU-868kt4bxc: `<a download>` y no `window.open`. El backend devuelve una URL firmada
    // de S3 de vida corta —el binario nunca pasa por la app— pero abrirla en una ventana
    // nueva la convierte en un pop-up que el navegador bloquea, porque entre el clic y la
    // apertura hay un `await`. Ver `lib/download.ts`.
    descargarArchivo(r.data.url, nombreDeReporte({ formato }));
  }

  return (
    <>
      <PageHeader
        icon={FileText}
        title={labels.title}
        subtitle={
          ultimo === undefined
            ? undefined
            : ultimo
              ? labels.downloadHeader.subtitle
              : labels.downloadHeader.empty
        }
        actions={
          ultimo ? (
            /* El grupo lleva nombre accesible propio: dos botones que solo dicen
               "Descargar PDF" y "Descargar Excel" no aclaran QUÉ se descarga, y en la fila
               del título ya no queda un encabezado de tarjeta que lo diga. */
            <div
              role="group"
              aria-label={labels.downloadHeader.title}
              className="flex flex-wrap gap-2"
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => void bajar('xlsx')}
              >
                <FileSpreadsheet className="h-4 w-4" strokeWidth={1.7} aria-hidden />
                {labels.downloadExcel}
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => void bajar('pdf')}>
                <Download className="h-4 w-4" strokeWidth={1.7} aria-hidden />
                {labels.downloadPdf}
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Fuera del `PageHeader`: un fallo de descarga no es parte del título de la
          pantalla, y meterlo en la fila la haría saltar de alto al aparecer. */}
      {error && (
        <p role="alert" className="mb-4 text-body text-danger">
          {error}
        </p>
      )}
    </>
  );
}
