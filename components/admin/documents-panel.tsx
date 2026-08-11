'use client';

import { useCallback } from 'react';
import { Card } from '@/components/ui/card';
import type { Dictionary } from '@/lib/i18n/dictionary';
import { AdminLoadError } from '@/components/admin/admin-load-error';
import { request } from '@/lib/api/browser';
import { usePagedList } from '@/lib/api/use-paged-list';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DocumentRow {
  id: string;
  companyId: string;
  companyName: string;
  originalFilename: string;
  status: string;
  rowCount: number | null;
  flaggedCount: number | null;
  errorReason: string | null;
  createdAt: string;
}

const PAGE_SIZE = 50;

// CU-868kfvag7 criterio 2: monitoreo de uploads/procesos, cross-company (staff ve todas).
export function DocumentsPanel({
  labels,
  common,
}: {
  labels: Dictionary['admin']['documents'];
  common: Dictionary['admin']['common'];
}) {
  // CU-868kkgb3c: un fallo dejaba el panel de monitoreo en blanco, que en una pantalla
  // cuyo trabajo es vigilar cargas se lee como "no hay cargas con problemas".
  const { state, loadMore, loadingMore, moreError, reload } = usePagedList<DocumentRow>(
    useCallback(async (offset) => {
      const result = await request<{ rows: DocumentRow[]; hasMore: boolean }>(
        `/api/admin/documents?limit=${PAGE_SIZE}&offset=${offset}`,
      );
      return result.ok
        ? { ok: true as const, data: { items: result.data.rows, hasMore: result.data.hasMore } }
        : result;
    }, []),
  );

  if (state.status === 'loading') return null;
  if (state.status === 'error')
    return <AdminLoadError error={state.error} labels={common.loadError} onRetry={reload} />;
  const docs = state.items;

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{labels.colCompany}</TableHead>
            <TableHead>{labels.colFile}</TableHead>
            <TableHead>{labels.colStatus}</TableHead>
            <TableHead>{labels.colRows}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.map((d) => (
            <TableRow key={d.id}>
              <TableCell>{d.companyName}</TableCell>
              <TableCell>{d.originalFilename}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    d.status === 'failed'
                      ? 'danger'
                      : d.status === 'promoted'
                        ? 'success'
                        : 'neutral'
                  }
                >
                  {d.status}
                </Badge>
                {d.errorReason && <p className="mt-1 text-body text-danger">{d.errorReason}</p>}
              </TableCell>
              <TableCell className="tabular-nums">
                {d.rowCount ?? '—'}{' '}
                {d.flaggedCount ? labels.flaggedSuffix.replace('{n}', String(d.flaggedCount)) : ''}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {moreError && (
        <AdminLoadError error={moreError} labels={common.loadError} onRetry={loadMore} />
      )}
      {state.hasMore && !moreError && (
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? common.loading : common.loadMore}
        </Button>
      )}
    </Card>
  );
}
