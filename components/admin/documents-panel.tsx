'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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

// CU-868kfvag7 criterio 2: monitoreo de uploads/procesos, cross-company (staff ve todas).
export function DocumentsPanel() {
  const [docs, setDocs] = useState<DocumentRow[] | null>(null);

  useEffect(() => {
    fetch('/api/admin/documents')
      .then((r) => r.json())
      .then(setDocs);
  }, []);

  if (!docs) return null;

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead>Archivo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Filas</TableHead>
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
              <TableCell className="font-mono tabular-nums">
                {d.rowCount ?? '—'} {d.flaggedCount ? `(${d.flaggedCount} marcadas)` : ''}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
