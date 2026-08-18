'use client';

import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { request } from '@/lib/api/browser';
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
  const [ultimo, setUltimo] = useState<string | null>(null);
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
    // Misma mecánica que el detalle del reporte: el backend devuelve una URL firmada de S3
    // de vida corta y el navegador la abre. El binario nunca pasa por la app.
    window.open(r.data.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <Card className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-cardh2">{labels.downloadHeader.title}</p>
        <p className="text-body text-muted-foreground">
          {ultimo ? labels.downloadHeader.subtitle : labels.downloadHeader.empty}
        </p>
        {error && (
          <p role="alert" className="mt-1 text-body text-danger">
            {error}
          </p>
        )}
      </div>

      {ultimo && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => void bajar('xlsx')}>
            <FileSpreadsheet className="h-4 w-4" strokeWidth={1.7} aria-hidden />
            {labels.downloadExcel}
          </Button>
          <Button className="gap-1.5" onClick={() => void bajar('pdf')}>
            <Download className="h-4 w-4" strokeWidth={1.7} aria-hidden />
            {labels.downloadPdf}
          </Button>
        </div>
      )}
    </Card>
  );
}
