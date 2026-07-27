'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface StagingRow {
  id: string;
  companyId: string;
  targetEntity: string;
  payload: Record<string, unknown>;
  confidence: string | null;
  flagReason: string | null;
  reviewStatus: string;
}

export function StagingRowsPanel() {
  const [rows, setRows] = useState<StagingRow[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function load() {
    fetch('/api/admin/staging-rows')
      .then((r) => r.json())
      .then((data: StagingRow[]) => {
        setRows(data);
        setDrafts(Object.fromEntries(data.map((r) => [r.id, JSON.stringify(r.payload, null, 2)])));
      });
  }
  useEffect(load, []);

  async function approve(id: string, reject = false) {
    const payload = JSON.parse(drafts[id] ?? '{}');
    await fetch(`/api/admin/staging-rows/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ payload, reviewStatus: reject ? 'rejected' : 'approved' }),
    });
    load();
  }

  async function reextract(id: string) {
    await fetch(`/api/admin/staging-rows/${id}/reextract`, { method: 'POST' });
    load();
  }

  if (!rows) return null;
  if (rows.length === 0)
    return <p className="text-body text-muted-foreground">Sin filas pendientes de revisión.</p>;

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <Card key={row.id}>
          <div className="flex items-center justify-between">
            <Badge variant="warning">{row.targetEntity}</Badge>
            <p className="font-mono text-eyebrow uppercase text-faint">{row.flagReason}</p>
          </div>
          <Textarea
            rows={5}
            className="mt-2 font-mono text-body"
            value={drafts[row.id] ?? ''}
            onChange={(e) => setDrafts({ ...drafts, [row.id]: e.target.value })}
          />
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => approve(row.id)}>
              Aprobar
            </Button>
            <Button size="sm" variant="outline" onClick={() => approve(row.id, true)}>
              Rechazar
            </Button>
            <Button size="sm" variant="outline" onClick={() => reextract(row.id)}>
              Re-extraer (IA, sin costo de créditos)
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
