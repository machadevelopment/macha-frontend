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

export function ReportList({ locale, labels }: { locale: Locale; labels: Dictionary['reports'] }) {
  const [reports, setReports] = useState<ReportRow[] | null>(null);

  useEffect(() => {
    fetch('/api/reports')
      .then((r) => r.json())
      .then(setReports);
  }, []);

  if (!reports) return null;
  if (reports.length === 0)
    return <p className="text-body text-muted-foreground">{labels.empty}</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Periodo</TableHead>
          <TableHead>Frecuencia</TableHead>
          <TableHead>Actualizado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map((r) => (
          <TableRow key={r.id}>
            <TableCell>
              <a href={`/reports/${r.id}`} className="text-body underline">
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
  );
}
