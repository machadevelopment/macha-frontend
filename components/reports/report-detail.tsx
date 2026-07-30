'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDate, formatMoney } from '@/lib/format';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

type Frequency = keyof Dictionary['reports']['frequencyValue'];

interface ReportData {
  id: string;
  periodStart: string;
  periodEnd: string;
  /** CU-868khvzve: ya venía en la respuesta del backend (`reports.frequency`) y el
   * cliente no la declaraba, así que se descartaba en silencio. */
  frequency: string;
  version: number;
  narrative: string;
  /** CU-868kh8rz8: moneda base REAL de la empresa. `metrics` no la trae (son
   * amount_base ya convertidos), así que viaja aparte en la respuesta. */
  baseCurrency: string;
  /** CU-868kh8uau: id de la versión actual (`report_versions.id`), no el del reporte. */
  versionId: string;
  metrics: {
    revenue: number;
    cogs: number;
    margin: number;
    accountsReceivableOpen: number;
    accountsPayableOpen: number;
  };
}

export function ReportDetail({
  reportId,
  locale,
  labels,
}: {
  reportId: string;
  locale: Locale;
  labels: Dictionary['reports'];
}) {
  const router = useRouter();
  const [report, setReport] = useState<ReportData | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/reports/${reportId}`)
      .then((r) => r.json())
      .then((data: ReportData) => {
        setReport(data);
        setDraft(data.narrative);
      });
  }, [reportId]);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/reports/${reportId}/versions`, {
        method: 'POST',
        body: JSON.stringify({ narrative: draft }),
      });
      const updated = await fetch(`/api/reports/${reportId}`).then((r) => r.json());
      setReport(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function openRendered() {
    const { url } = await fetch(`/api/reports/${reportId}/view`).then((r) => r.json());
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // CU-868kh8uau: se manda `versionId` (el `report_versions.id` real), no `reportId`.
  // Antes iba el id del REPORTE en el campo que dice contener el de la VERSIÓN y, al no
  // haber FK, la referencia falsa se persistía en silencio. El backend ahora valida y
  // la FK compuesta de la migración 0011 lo hace imposible a nivel de base.
  async function askInChat() {
    if (!report) return;
    const res = await fetch('/api/chats', {
      method: 'POST',
      body: JSON.stringify({
        title: `${labels.chatThreadTitle} ${report.periodStart}`,
        reportVersionId: report.versionId,
      }),
    });
    const chat: { id: string } = await res.json();
    router.push(`/chat?thread=${chat.id}`);
  }

  if (!report) return null;
  const currency = report.baseCurrency as 'GTQ' | 'USD';
  const frequencyLabel = labels.frequencyValue[report.frequency as Frequency] ?? report.frequency;

  return (
    <div className="flex flex-col gap-4">
      {/* CU-868khvzve: la pantalla no decía de qué reporte era. El eyebrow y el título
          repetían los de la lista ("REPORTES / Reportes") y el único identificador
          visible era "v3": llegando por el deep-link del email —que es el camino
          normal— no había forma de saber qué se estaba leyendo. El período es la
          identidad del documento, así que es el título. */}
      <div>
        <h1 className="font-mono text-h1 tabular-nums">
          {formatDate(report.periodStart, locale)} — {formatDate(report.periodEnd, locale)}
        </h1>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant="neutral">{frequencyLabel}</Badge>
          <span className="font-mono text-eyebrow uppercase text-faint">
            {labels.baseCurrencyLabel}: {currency}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={openRendered}>
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.7} />
          {labels.viewRendered}
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={askInChat}>
          <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.7} />
          {labels.askInChat}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <p className="font-mono text-eyebrow uppercase text-faint">{labels.kpi.revenue}</p>
          <p className="mt-1 font-mono text-kpi tabular-nums">
            {formatMoney(report.metrics.revenue, currency, locale)}
          </p>
        </Card>
        <Card>
          <p className="font-mono text-eyebrow uppercase text-faint">{labels.kpi.cogs}</p>
          <p className="mt-1 font-mono text-kpi tabular-nums">
            {formatMoney(report.metrics.cogs, currency, locale)}
          </p>
        </Card>
        <Card>
          <p className="font-mono text-eyebrow uppercase text-faint">{labels.kpi.margin}</p>
          <p className="mt-1 font-mono text-kpi tabular-nums">
            {formatMoney(report.metrics.margin, currency, locale)}
          </p>
        </Card>
      </div>

      {/* CU-868khvzve criterio 3: `accountsReceivableOpen`/`accountsPayableOpen` ya
          venían en `metrics` y no se mostraban. Van en una fila aparte y no junto a los
          tres de arriba a propósito: ingresos/costo/margen son el resultado del período,
          estos dos son posición de liquidez al cierre — mezclarlos en una sola fila de
          cinco sugeriría que se leen igual. */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="font-mono text-eyebrow uppercase text-faint">{labels.kpi.arOpen}</p>
          <p className="mt-1 font-mono text-kpi tabular-nums">
            {formatMoney(report.metrics.accountsReceivableOpen, currency, locale)}
          </p>
        </Card>
        <Card>
          <p className="font-mono text-eyebrow uppercase text-faint">{labels.kpi.apOpen}</p>
          <p className="mt-1 font-mono text-kpi tabular-nums">
            {formatMoney(report.metrics.accountsPayableOpen, currency, locale)}
          </p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <p className="font-mono text-eyebrow uppercase text-faint">v{report.version}</p>
          {!editing && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              {labels.edit}
            </Button>
          )}
        </div>
        {editing ? (
          <div className="mt-2 flex flex-col gap-2">
            <Textarea rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} />
            <Button size="sm" onClick={save} disabled={saving} className="self-start">
              {saving ? labels.saving : labels.save}
            </Button>
          </div>
        ) : (
          <p className="mt-2 whitespace-pre-wrap text-body">{report.narrative}</p>
        )}
      </Card>
    </div>
  );
}
