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
const PAGE_SIZE = 50;
/** Techo que el backend aplica a `limit` (CU-868kh913c). */
const MAX_PAGE = 200;

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
  const [hasMore, setHasMore] = useState(false);
  const [reverting, setReverting] = useState<string | null>(null);

  // CU-868kh913c: el backend truncaba a 50 en silencio y no aceptaba paginación —
  // el documento 51 era inalcanzable. Ahora se pide por páginas.
  const loadPage = useCallback((offset: number) => {
    fetch(`/api/documents?limit=${PAGE_SIZE}&offset=${offset}`)
      .then((r) => r.json())
      .then((data: { documents: DocumentRow[]; hasMore: boolean }) => {
        setDocuments((prev) =>
          offset === 0 ? data.documents : [...(prev ?? []), ...data.documents],
        );
        setHasMore(data.hasMore);
      });
  }, []);

  /**
   * Refresco para el polling y para después de revertir: reemplaza lo que ya está
   * en pantalla en vez de volver a la primera página, para no descartar en silencio
   * las páginas que el usuario ya cargó. Se acota al techo de `limit` del backend.
   */
  const refresh = useCallback(() => {
    const shown = Math.min(Math.max(documents?.length ?? 0, PAGE_SIZE), MAX_PAGE);
    fetch(`/api/documents?limit=${shown}&offset=0`)
      .then((r) => r.json())
      .then((data: { documents: DocumentRow[]; hasMore: boolean }) => {
        setDocuments(data.documents);
        setHasMore(data.hasMore);
      });
  }, [documents?.length]);

  // CU-868kh8nhy: revertir hace soft-delete de todas las filas de negocio que este
  // documento promovió. Se confirma antes porque es destructivo y no hay "deshacer
  // el deshacer" en la UI.
  async function revert(id: string) {
    if (!window.confirm(labels.revertConfirm)) return;
    setReverting(id);
    try {
      await fetch(`/api/documents/${id}/revert`, { method: 'POST' });
      refresh();
    } finally {
      setReverting(null);
    }
  }

  // Una carga nueva (refreshToken) sí vuelve a la primera página: el documento
  // recién subido es lo primero de la lista, ordenada por createdAt desc.
  useEffect(() => {
    loadPage(0);
  }, [loadPage, refreshToken]);

  // Poll only while at least one upload is still in flight — no point hammering
  // the backend once everything is a terminal status (promoted/reverted/failed).
  useEffect(() => {
    const hasInFlight = documents?.some((d) => IN_FLIGHT.includes(d.status));
    if (!hasInFlight) return;
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [documents, refresh]);

  if (!documents) return null;
  if (documents.length === 0) {
    return <p className="text-body text-muted-foreground">{labels.empty}</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{labels.table.file}</TableHead>
            <TableHead>{labels.table.status}</TableHead>
            <TableHead>{labels.table.date}</TableHead>
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
      {hasMore && (
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={() => loadPage(documents.length)}
        >
          {labels.loadMore}
        </Button>
      )}
    </>
  );
}
