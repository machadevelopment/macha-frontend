'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatMoney } from '@/lib/format';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

interface ReportData {
  id: string;
  periodStart: string;
  periodEnd: string;
  version: number;
  narrative: string;
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

  async function askInChat() {
    const res = await fetch('/api/chats', {
      method: 'POST',
      body: JSON.stringify({ title: `Reporte ${report?.periodStart}`, reportVersionId: reportId }),
    });
    const chat: { id: string } = await res.json();
    router.push(`/chat?thread=${chat.id}`);
  }

  if (!report) return null;
  const currency: 'GTQ' | 'USD' = 'GTQ'; // metrics no traen moneda propia; el reporte hereda la de la empresa

  return (
    <div className="flex flex-col gap-4">
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
          <p className="font-mono text-eyebrow uppercase text-faint">Ingresos</p>
          <p className="mt-1 font-mono text-kpi tabular-nums">
            {formatMoney(report.metrics.revenue, currency, locale)}
          </p>
        </Card>
        <Card>
          <p className="font-mono text-eyebrow uppercase text-faint">Costo de ventas</p>
          <p className="mt-1 font-mono text-kpi tabular-nums">
            {formatMoney(report.metrics.cogs, currency, locale)}
          </p>
        </Card>
        <Card>
          <p className="font-mono text-eyebrow uppercase text-faint">Margen</p>
          <p className="mt-1 font-mono text-kpi tabular-nums">
            {formatMoney(report.metrics.margin, currency, locale)}
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
