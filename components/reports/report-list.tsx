'use client';

import { useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { LoadError } from '@/components/ui/load-error';
import { request } from '@/lib/api/browser';
import { usePagedList } from '@/lib/api/use-paged-list';
import { formatDate } from '@/lib/format';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

interface ReportRow {
  id: string;
  periodStart: string;
  periodEnd: string;
  frequency: string;
  updatedAt: string;
}

const PAGE_SIZE = 50;

export function ReportList({
  locale,
  labels,
  common,
}: {
  locale: Locale;
  labels: Dictionary['reports'];
  common: Dictionary['common'];
}) {
  // CU-868kh913c: antes el backend devolvía TODOS los reportes de la empresa y este
  // componente los renderizaba de una vez. Con el tick diario son ~365 filas al año.
  // Mismo patrón "load more" que los paneles de admin (CU-868kfvaz9).
  //
  // CU-868kkgb3c: el `load` de antes no miraba `res.ok` ni tenía `.catch`, así que un
  // backend caído dejaba la lista en `null` — que esta pantalla renderizaba igual que
  // "todavía no tienes reportes".
  const { state, loadMore, loadingMore, moreError, reload } = usePagedList<ReportRow>(
    useCallback(async (offset) => {
      const result = await request<{ reports: ReportRow[]; hasMore: boolean }>(
        `/api/reports?limit=${PAGE_SIZE}&offset=${offset}`,
      );
      return result.ok
        ? { ok: true as const, data: { items: result.data.reports, hasMore: result.data.hasMore } }
        : result;
    }, []),
  );

  if (state.status === 'loading') {
    return <p className="text-body text-muted-foreground">{common.loading}</p>;
  }
  if (state.status === 'error') {
    return <LoadError error={state.error} labels={common.loadError} onRetry={reload} />;
  }

  const reports = state.items;
  if (reports.length === 0)
    return <p className="text-body text-muted-foreground">{labels.empty}</p>;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{labels.table.period}</TableHead>
            <TableHead>{labels.table.frequency}</TableHead>
            <TableHead>{labels.table.updated}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <a href={`/reports/${r.id}`} className="tabular-nums underline">
                  {formatDate(r.periodStart, locale)} — {formatDate(r.periodEnd, locale)}
                </a>
              </TableCell>
              <TableCell className="font-mono text-eyebrow uppercase text-faint">
                {r.frequency}
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {formatDate(r.updatedAt, locale)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* El error de una página siguiente va acá y no reemplaza la tabla: lo ya cargado
          se queda (ver `usePagedList`). */}
      {moreError && <LoadError error={moreError} labels={common.loadError} onRetry={loadMore} />}
      {state.hasMore && !moreError && (
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? common.loading : labels.loadMore}
        </Button>
      )}
    </>
  );
}
