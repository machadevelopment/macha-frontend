'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface StagingRow {
  id: string;
  companyId: string;
  /** CU-868khvzqn: lo agrega el join del backend (`modules/admin/staging-rows.ts`),
   * igual que en `/admin/documents`. El UUID solo no le dice nada a un operador. */
  companyName: string;
  targetEntity: string;
  payload: Record<string, unknown>;
  confidence: string | null;
  flagReason: string | null;
  reviewStatus: string;
}

const PAGE_SIZE = 50;

export function StagingRowsPanel() {
  const [rows, setRows] = useState<StagingRow[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function load(offset = 0) {
    fetch(`/api/admin/staging-rows?limit=${PAGE_SIZE}&offset=${offset}`)
      .then((r) => r.json())
      .then((data: { rows: StagingRow[]; hasMore: boolean }) => {
        setRows((prev) => (offset === 0 ? data.rows : [...(prev ?? []), ...data.rows]));
        setHasMore(data.hasMore);
        setDrafts((prev) => ({
          ...(offset === 0 ? {} : prev),
          ...Object.fromEntries(data.rows.map((r) => [r.id, JSON.stringify(r.payload, null, 2)])),
        }));
      });
  }
  useEffect(() => load(0), []);

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
          {/* CU-868khvzqn: la empresa encabeza la card y no es un dato más al margen.
              La lista mezcla tenants (viene ordenada por fecha, no agrupada), así que
              es lo primero que hay que leer antes de aprobar o rechazar: lo que se
              apruebe acá se promueve a la contabilidad de ese cliente. */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-eyebrow uppercase text-faint">EMPRESA</p>
              <p className="truncate text-cardh2">{row.companyName}</p>
            </div>
            <Badge variant="warning">{row.targetEntity}</Badge>
          </div>
          <p className="mt-2 font-mono text-eyebrow uppercase text-faint">{row.flagReason}</p>
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
      {hasMore && (
        <Button size="sm" variant="outline" onClick={() => load(rows.length)}>
          Cargar más
        </Button>
      )}
    </div>
  );
}
