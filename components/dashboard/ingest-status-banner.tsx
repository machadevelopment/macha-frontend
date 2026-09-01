'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { request } from '@/lib/api/browser';
import type { Dictionary } from '@/lib/i18n/dictionary';

interface DocumentRow {
  id: string;
  originalFilename: string;
  status: 'queued' | 'processing' | 'review' | 'promoted' | 'reverted' | 'failed' | 'cancelled';
  rowCount: number | null;
  flaggedCount: number | null;
}

/**
 * CU-868kn5hqu — por qué el dashboard puede estar en cero.
 *
 * EL PROBLEMA QUE RESUELVE. El primer Excel real de producción se ingirió completo —1.062
 * filas clasificadas— y el dashboard siguió mostrando **ceros**. No era un bug: 542 filas
 * quedaron marcadas por baja confianza. El dueño no veía nada de eso: subía su Excel, abría el
 * panorama financiero y encontraba ceros mudos, justo después de la acción más importante que
 * existe en el producto. Se lee como que está roto.
 *
 * ⚠️ EL TEXTO DECÍA "LA PROMOCIÓN ES ATÓMICA" Y ESO DEJÓ DE SER CIERTO (corregido 2026-08-31).
 * Desde la migración 0020 —promoción PARCIAL, decisión de Keneth del 2026-08-07— las filas
 * limpias entran solas y solo se retienen las marcadas. El cartel siguió diciéndole al cliente
 * que "nada entra a tus reportes hasta que la carga completa esté revisada", que es lo
 * contrario de lo que pasa, durante tres semanas.
 *
 * No es un detalle de redacción: el correo de confirmación que se está construyendo dice —bien—
 * que "el resto de tus datos ya está en tu dashboard". Los dos mensajes juntos se contradicen
 * sobre la misma carga con minutos de diferencia, en una herramienta cuyo valor entero es
 * confiar en las cifras. Y el texto viejo además decía que las filas "necesitan que LAS
 * REVISEMOS", cuando desde el acuerdo con Semi (2026-08-20) las contesta el CLIENTE.
 *
 * Se muestra únicamente cuando hay algo en vuelo. Un dashboard en cero porque la empresa
 * realmente no tiene datos NO debe explicarse con este cartel — ahí el cero es la verdad.
 */
export function IngestStatusBanner({ labels }: { labels: Dictionary['dashboard']['ingest'] }) {
  const [enVuelo, setEnVuelo] = useState<DocumentRow[]>([]);

  useEffect(() => {
    // Una sola lectura, sin polling: el listado de `/upload` ya refresca solo mientras
    // hay cargas en proceso (CU-868kh913c). Repetirlo acá sería una segunda encuesta
    // sobre el mismo dato en la pantalla que más peticiones hace.
    void request<{ documents: DocumentRow[] }>('/api/documents?limit=20').then((r) => {
      if (!r.ok) return; // el fallo ya lo reportan los paneles de datos; acá callar es correcto
      setEnVuelo(
        r.data.documents.filter(
          (d) => d.status === 'queued' || d.status === 'processing' || d.status === 'review',
        ),
      );
    });
  }, []);

  if (enVuelo.length === 0) return null;

  const enRevision = enVuelo.filter((d) => d.status === 'review');
  const procesando = enVuelo.length - enRevision.length;
  // `?? 0` y no un guion: la suma es informativa y un documento viejo puede no tener el
  // conteo persistido (se empezó a guardar en CU-868kn5hqu).
  const filasPendientes = enRevision.reduce((total, d) => total + (d.flaggedCount ?? 0), 0);

  return (
    <Card className="border-warning-bd bg-warning-bg">
      <p className="font-mono text-eyebrow uppercase text-warning">{labels.eyebrow}</p>
      <p className="mt-1 text-body text-foreground">
        {enRevision.length > 0
          ? filasPendientes > 0
            ? labels.inReviewWithRows
                .replace('{docs}', String(enRevision.length))
                .replace('{rows}', String(filasPendientes))
            : labels.inReview.replace('{docs}', String(enRevision.length))
          : labels.processing.replace('{docs}', String(procesando))}
      </p>
      <p className="mt-1 text-body text-muted-foreground">{labels.explainer}</p>
      <Link href="/upload" className="mt-2 inline-block text-body underline">
        {labels.cta}
      </Link>
    </Card>
  );
}
