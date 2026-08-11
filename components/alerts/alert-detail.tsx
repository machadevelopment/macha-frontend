'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { request } from '@/lib/api/browser';
import { formatDate } from '@/lib/format';
import { RULE_UNIT, isKnownRule } from '@/lib/alerts/rule-units';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

interface AlertData {
  id: string;
  ruleKey: string;
  /** `numeric` en Postgres — llega como string decimal, nunca como number (regla no
   * negociable de dinero/precisión). No se pasa por parseFloat para mostrarlo. */
  threshold: string;
  triggeredValue: string;
  /** Las reglas que afectan liquidez notifican por email de inmediato; el resto se
   * acumulan en el reporte periódico (catálogo aprobado en CU-868kfv993). */
  notifyImmediately: boolean;
  createdAt: string;
  document: { id: string; originalFilename: string } | null;
}

// CU-868khvzqn: `RULE_UNIT` y `isKnownRule` vivían aquí. Se movieron a
// `lib/alerts/rule-units.ts` porque el histórico de alertas y los umbrales del
// backoffice necesitan el mismo mapa — copiarlo era garantizar que se desincronizara.

export function AlertDetail({
  alertId,
  locale,
  labels,
}: {
  alertId: string;
  locale: Locale;
  labels: Dictionary['alerts'];
}) {
  const [alert, setAlert] = useState<AlertData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // CU-868kkgb3c: el `!r.ok` ya estaba (CU-868kh8jxf), pero un `r.json()` que lanzara
    // sobre un 200 con cuerpo corrupto quedaba como unhandled rejection.
    void request<AlertData>(`/api/alerts/${alertId}`).then((result) => {
      if (result.ok) setAlert(result.data);
      else setNotFound(true);
    });
  }, [alertId]);

  // El link viene de un email: un id viejo o de otra empresa es un caso normal, no un
  // error de la app. Se muestra el mensaje y una salida, no una pantalla en blanco.
  if (notFound) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-body text-muted-foreground">{labels.notFound}</p>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-body underline">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.7} />
          {labels.backToDashboard}
        </Link>
      </div>
    );
  }

  if (!alert) return null;

  const ruleLabel = isKnownRule(alert.ruleKey) ? labels.rule[alert.ruleKey] : alert.ruleKey;
  const unit = isKnownRule(alert.ruleKey) ? labels.unit[RULE_UNIT[alert.ruleKey]] : '';

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{ruleLabel}</CardTitle>
          {/* Color como señal de estado, nunca decorativo (design guide §1): una regla
              que afecta liquidez pesa más que una que se acumula en el reporte. */}
          <Badge variant={alert.notifyImmediately ? 'danger' : 'warning'}>{labels.eyebrow}</Badge>
        </CardHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <p className="font-mono text-eyebrow uppercase text-faint">{labels.triggeredValue}</p>
            <p className="mt-1 text-kpi tabular-nums">
              {alert.triggeredValue}
              <span className="ml-1 text-body text-muted-foreground">{unit}</span>
            </p>
          </div>
          <div>
            <p className="font-mono text-eyebrow uppercase text-faint">{labels.threshold}</p>
            <p className="mt-1 text-kpi tabular-nums text-muted-foreground">
              {alert.threshold}
              <span className="ml-1 text-body">{unit}</span>
            </p>
          </div>
          <div>
            <p className="font-mono text-eyebrow uppercase text-faint">{labels.triggeredAt}</p>
            <p className="mt-1 tabular-nums">{formatDate(alert.createdAt, locale)}</p>
          </div>
        </div>
      </Card>

      <Card>
        <p className="font-mono text-eyebrow uppercase text-faint">{labels.sourceDocument}</p>
        {alert.document ? (
          <p className="mt-1 inline-flex items-center gap-1.5 text-body">
            <FileSpreadsheet className="h-3.5 w-3.5 text-faint" strokeWidth={1.7} />
            {alert.document.originalFilename}
          </p>
        ) : (
          <p className="mt-1 text-body text-muted-foreground">{labels.noSourceDocument}</p>
        )}
      </Card>

      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-body underline">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.7} />
        {labels.backToDashboard}
      </Link>
    </div>
  );
}
