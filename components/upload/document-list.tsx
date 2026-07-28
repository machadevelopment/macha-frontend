'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { DocumentPipeline, type DocumentStatus } from '@/components/upload/pipeline';
import { formatDate } from '@/lib/format';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

interface DocumentRow {
  id: string;
  originalFilename: string;
  status: DocumentStatus;
  rowCount: number | null;
  flaggedCount: number | null;
  errorReason: string | null;
  createdAt: string;
}

const IN_FLIGHT: DocumentStatus[] = ['queued', 'processing', 'review'];
const POLL_MS = 4000;

export function DocumentList({
  locale,
  labels,
  refreshToken,
  canRevert,
}: {
  locale: Locale;
  labels: Dictionary['upload'];
  refreshToken: number;
  canRevert: boolean;
}) {
  const [documents, setDocuments] = useState<DocumentRow[] | null>(null);
  const [reverting, setReverting] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch('/api/documents')
      .then((r) => r.json())
      .then((data: { documents: DocumentRow[] }) => setDocuments(data.documents));
  }, []);

  // CU-868kh8nhy: revertir hace soft-delete de todas las filas de negocio que este
  // documento promovió. Se confirma antes porque es destructivo y no hay "deshacer
  // el deshacer" en la UI.
  async function revert(id: string) {
    if (!window.confirm(labels.revertConfirm)) return;
    setReverting(id);
    try {
      await fetch(`/api/documents/${id}/revert`, { method: 'POST' });
      load();
    } finally {
      setReverting(null);
    }
  }

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  // Poll only while at least one upload is still in flight — no point hammering
  // the backend once everything is a terminal status (promoted/reverted/failed).
  useEffect(() => {
    const hasInFlight = documents?.some((d) => IN_FLIGHT.includes(d.status));
    if (!hasInFlight) return;
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [documents, load]);

  if (!documents) return null;
  if (documents.length === 0) {
    return <p className="text-body text-muted-foreground">{labels.empty}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Archivo</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Fecha</TableHead>
          {canRevert && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell className="text-body">{doc.originalFilename}</TableCell>
            <TableCell>
              {IN_FLIGHT.includes(doc.status) ? (
                <DocumentPipeline status={doc.status} labels={labels.step} />
              ) : (
                <Badge
                  variant={
                    doc.status === 'failed'
                      ? 'danger'
                      : doc.status === 'reverted'
                        ? 'neutral'
                        : 'success'
                  }
                >
                  {labels.status[doc.status]}
                </Badge>
              )}
              {doc.status === 'failed' && doc.errorReason && (
                <p className="mt-1 text-body text-danger">{doc.errorReason}</p>
              )}
            </TableCell>
            <TableCell className="font-mono tabular-nums text-muted-foreground">
              {formatDate(doc.createdAt, locale)}
            </TableCell>
            {canRevert && (
              <TableCell>
                {/* Solo un documento promovido tiene filas que deshacer — el backend
                    responde 409 en cualquier otro estado. */}
                {doc.status === 'promoted' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => revert(doc.id)}
                    disabled={reverting === doc.id}
                  >
                    {reverting === doc.id ? labels.reverting : labels.revert}
                  </Button>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
