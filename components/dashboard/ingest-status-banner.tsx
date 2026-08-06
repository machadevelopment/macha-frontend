'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { request } from '@/lib/api/browser';
import type { Dictionary } from '@/lib/i18n/dictionary';

interface DocumentRow {
  id: string;
  originalFilename: string;
  status: 'queued' | 'processing' | 'review' | 'promoted' | 'reverted' | 'failed';
  rowCount: number | null;
  flaggedCount: number | null;
}

/**
 * CU-868kn5hqu — por qué el dashboard puede estar en cero.
 *
 * EL PROBLEMA QUE RESUELVE. El primer Excel real de producción se ingirió completo —1.062
 * filas clasificadas— y el dashboard siguió mostrando **ceros**. No es un bug: 542 filas
 * quedaron marcadas por baja confianza y la promoción es atómica, así que nada entra al
 * ledger hasta que se resuelvan. Pero el dueño no ve nada de eso: sube su Excel, abre el
 * panorama financiero y encuentra ceros mudos, justo después de la acción más importante
 * que existe en el producto. Se lee como que está roto.
 *
 * Esto no cambia la atomicidad ni promueve nada: solo deja de ocultar el motivo.
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
