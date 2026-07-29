'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

type RuleKey = keyof Dictionary['alerts']['rule'];

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

/**
 * Unidad de cada regla, espejo de `config/alert-catalog.ts` en el backend. `ar_overdue`
 * se mide en días de vencimiento; las otras cinco son porcentajes. Sin esto un "60" se
 * leería como 60% cuando son 60 días.
 */
const RULE_UNIT: Record<RuleKey, 'days' | 'percent'> = {
  ar_overdue: 'days',
  portfolio_concentration: 'percent',
  revenue_drop: 'percent',
  margin_drop: 'percent',
  spend_out_of_range: 'percent',
  low_credit_balance: 'percent',
};

function isKnownRule(key: string): key is RuleKey {
  return key in RULE_UNIT;
}

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
    fetch(`/api/alerts/${alertId}`).then(async (r) => {
      if (!r.ok) {
        setNotFound(true);
        return;
      }
      setAlert((await r.json()) as AlertData);
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

        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="font-mono text-eyebrow uppercase text-faint">{labels.triggeredValue}</p>
            <p className="mt-1 font-mono text-kpi tabular-nums">
              {alert.triggeredValue}
              <span className="ml-1 text-body text-muted-foreground">{unit}</span>
            </p>
          </div>
          <div>
            <p className="font-mono text-eyebrow uppercase text-faint">{labels.threshold}</p>
            <p className="mt-1 font-mono text-kpi tabular-nums text-muted-foreground">
              {alert.threshold}
              <span className="ml-1 text-body">{unit}</span>
            </p>
          </div>
          <div>
            <p className="font-mono text-eyebrow uppercase text-faint">{labels.triggeredAt}</p>
            <p className="mt-1 font-mono tabular-nums">{formatDate(alert.createdAt, locale)}</p>
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
