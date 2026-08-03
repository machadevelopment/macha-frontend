'use client';

import { useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AdminLoadError } from '@/components/admin/admin-load-error';
import { request, requestJson } from '@/lib/api/browser';
import { usePagedList } from '@/lib/api/use-paged-list';

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
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  /** Error por fila: cada una se aprueba/rechaza por separado. */
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const { state, loadMore, loadingMore, moreError, reload } = usePagedList<StagingRow>(
    useCallback(async (offset) => {
      const result = await request<{ rows: StagingRow[]; hasMore: boolean }>(
        `/api/admin/staging-rows?limit=${PAGE_SIZE}&offset=${offset}`,
      );
      if (!result.ok) return result;
      setDrafts((prev) => ({
        ...(offset === 0 ? {} : prev),
        ...Object.fromEntries(
          result.data.rows.map((r) => [r.id, JSON.stringify(r.payload, null, 2)]),
        ),
      }));
      return {
        ok: true as const,
        data: { items: result.data.rows, hasMore: result.data.hasMore },
      };
    }, []),
  );

  function setRowError(id: string, message: string | null) {
    setRowErrors((prev) => {
      const next = { ...prev };
      if (message === null) delete next[id];
      else next[id] = message;
      return next;
    });
  }

  /**
   * CU-868kkgb3c: aprobar una fila la promueve a la contabilidad REAL del cliente
   * (`document_staging_rows` → transactions/invoices/bills). Esto no miraba `res.ok`:
   * un rechazo del backend se veía igual que un éxito —la lista recargaba y la fila
   * seguía ahí— y el staff no tenía forma de saber si lo que aprobó entró o no.
   *
   * `JSON.parse` sobre el draft editado tampoco estaba protegido: un JSON malformado
   * lanzaba dentro del onClick y no pasaba nada visible.
   */
  async function approve(id: string, reject = false) {
    let payload: unknown;
    try {
      payload = JSON.parse(drafts[id] ?? '{}');
    } catch {
      setRowError(id, 'El payload no es JSON válido.');
      return;
    }
    setRowError(id, null);
    const result = await requestJson(`/api/admin/staging-rows/${id}`, 'PATCH', {
      payload,
      reviewStatus: reject ? 'rejected' : 'approved',
    });
    if (!result.ok) {
      setRowError(id, 'No se pudo guardar la revisión de esta fila.');
      return;
    }
    reload();
  }

  async function reextract(id: string) {
    setRowError(id, null);
    const result = await requestJson(`/api/admin/staging-rows/${id}/reextract`, 'POST');
    if (!result.ok) {
      setRowError(id, 'No se pudo re-extraer esta fila.');
      return;
    }
    reload();
  }

  if (state.status === 'loading') return null;
  if (state.status === 'error') return <AdminLoadError error={state.error} onRetry={reload} />;

  const rows = state.items;
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
          {rowErrors[row.id] && <p className="mt-2 text-body text-danger">{rowErrors[row.id]}</p>}
        </Card>
      ))}
      {moreError && <AdminLoadError error={moreError} onRetry={loadMore} />}
      {state.hasMore && !moreError && (
        <Button size="sm" variant="outline" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Cargando…' : 'Cargar más'}
        </Button>
      )}
    </div>
  );
}
