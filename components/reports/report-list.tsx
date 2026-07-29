'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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

export function ReportList({ locale, labels }: { locale: Locale; labels: Dictionary['reports'] }) {
  const [reports, setReports] = useState<ReportRow[] | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // CU-868kh913c: antes el backend devolvía TODOS los reportes de la empresa y este
  // componente los renderizaba de una vez. Con el tick diario son ~365 filas al año.
  // Mismo patrón "load more" que los paneles de admin (CU-868kfvaz9).
  function load(offset = 0) {
    fetch(`/api/reports?limit=${PAGE_SIZE}&offset=${offset}`)
      .then((r) => r.json())
      .then((data: { reports: ReportRow[]; hasMore: boolean }) => {
        setReports((prev) => (offset === 0 ? data.reports : [...(prev ?? []), ...data.reports]));
        setHasMore(data.hasMore);
      });
  }

  useEffect(() => load(0), []);

  if (!reports) return null;
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
                <a href={`/reports/${r.id}`} className="font-mono tabular-nums underline">
                  {formatDate(r.periodStart, locale)} — {formatDate(r.periodEnd, locale)}
                </a>
              </TableCell>
              <TableCell className="font-mono text-eyebrow uppercase text-faint">
                {r.frequency}
              </TableCell>
              <TableCell className="font-mono tabular-nums text-muted-foreground">
                {formatDate(r.updatedAt, locale)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hasMore && (
        <Button size="sm" variant="outline" className="mt-3" onClick={() => load(reports.length)}>
          {labels.loadMore}
        </Button>
      )}
    </>
  );
}
