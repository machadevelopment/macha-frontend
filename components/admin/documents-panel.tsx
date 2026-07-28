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
export function DocumentsPanel() {
  const [docs, setDocs] = useState<DocumentRow[] | null>(null);
  const [hasMore, setHasMore] = useState(false);

  function load(offset = 0) {
    fetch(`/api/admin/documents?limit=${PAGE_SIZE}&offset=${offset}`)
      .then((r) => r.json())
      .then((data: { rows: DocumentRow[]; hasMore: boolean }) => {
        setDocs((prev) => (offset === 0 ? data.rows : [...(prev ?? []), ...data.rows]));
        setHasMore(data.hasMore);
      });
  }
  useEffect(() => load(0), []);

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
      {hasMore && (
        <Button size="sm" variant="outline" className="mt-3" onClick={() => load(docs.length)}>
          Cargar más
        </Button>
      )}
    </Card>
  );
}
