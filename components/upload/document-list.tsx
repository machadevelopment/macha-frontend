'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import { LoadError } from '@/components/ui/load-error';
import { DocumentPipeline, type DocumentStatus } from '@/components/upload/pipeline';
import { errorMessage, request, requestJson } from '@/lib/api/browser';
import { usePagedList } from '@/lib/api/use-paged-list';
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

interface DocumentsPage {
  documents: DocumentRow[];
  hasMore: boolean;
}

export function DocumentList({
  locale,
  labels,
  common,
  refreshToken,
  canRevert,
}: {
  locale: Locale;
  labels: Dictionary['upload'];
  common: Dictionary['common'];
  refreshToken: number;
  canRevert: boolean;
}) {
  const [reverting, setReverting] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  // CU-868kh913c: el backend truncaba a 50 en silencio y el documento 51 era inalcanzable.
  // CU-868kkgb3c: antes ni la carga inicial ni el polling miraban `res.ok`.
  const { state, loadMore, loadingMore, moreError, reload, replace } = usePagedList<DocumentRow>(
    useCallback(async (offset) => {
      const result = await request<DocumentsPage>(
        `/api/documents?limit=${PAGE_SIZE}&offset=${offset}`,
      );
      return result.ok
        ? {
            ok: true as const,
            data: { items: result.data.documents, hasMore: result.data.hasMore },
          }
        : result;
    }, []),
    // Una carga nueva vuelve a la primera página: el documento recién subido es lo
    // primero de la lista, ordenada por createdAt desc.
    [refreshToken],
  );

  const shown = state.status === 'ready' ? state.items.length : 0;

  /**
   * Refresco para el polling y para después de revertir: reemplaza lo que ya está en
   * pantalla en vez de volver a la primera página, para no descartar en silencio las
   * páginas que el usuario ya cargó. Se acota al techo de `limit` del backend.
   *
   * CU-868kkgb3c: si el refresco falla **no pasa nada visible** — se conserva la tabla
   * que ya estaba. Un poll que no responde no es un evento que el usuario deba atender;
   * vaciar la tabla, o avisarle cada 4 segundos, sí sería un problema.
   */
  const refresh = useCallback(() => {
    const limit = Math.min(Math.max(shown, PAGE_SIZE), MAX_PAGE);
    void request<DocumentsPage>(`/api/documents?limit=${limit}&offset=0`).then((result) => {
      if (result.ok) replace(result.data.documents, result.data.hasMore);
    });
  }, [shown, replace]);

  // CU-868kh8nhy: revertir hace soft-delete de todas las filas de negocio que este
  // documento promovió. Se confirma antes porque es destructivo y no hay "deshacer el
  // deshacer" en la UI.
  async function revert(id: string) {
    if (!window.confirm(labels.revertConfirm)) return;
    setReverting(id);
    try {
      const result = await requestJson(`/api/documents/${id}/revert`, 'POST');
      if (!result.ok) {
        // CU-868kkgb3c: la ruta BFF se molesta en propagar el status real del backend
        // (403 sin permiso, 409 si el documento no está promovido) y esto lo tiraba: el
        // botón giraba, la tabla se refrescaba y no pasaba nada. El usuario se quedaba
        // creyendo que había revertido una carga que sigue promovida.
        toast.error(errorMessage(result.error) ?? common.loadError.server);
        return;
      }
      refresh();
    } finally {
      setReverting(null);
    }
  }

  /**
   * Reintento de una carga fallida: el archivo original sigue en S3 y el worker es
   * reanudable por lote, así que no hace falta volver a subirlo (backend
   * `POST /documents/:id/retry`). Sin confirmación previa —a diferencia de revertir—
   * porque no destruye nada: reintentar en el peor caso vuelve a fallar igual.
   */
  async function retry(id: string) {
    setRetrying(id);
    try {
      const result = await requestJson(`/api/documents/${id}/retry`, 'POST');
      if (!result.ok) {
        toast.error(errorMessage(result.error) ?? common.loadError.server);
        return;
      }
      // El documento vuelve a `queued`, así que esto también reactiva el polling.
      refresh();
    } finally {
      setRetrying(null);
    }
  }

  // Poll only while at least one upload is still in flight — no point hammering the
  // backend once everything is a terminal status (promoted/reverted/failed).
  const hasInFlight =
    state.status === 'ready' && state.items.some((d) => IN_FLIGHT.includes(d.status));

  useEffect(() => {
    if (!hasInFlight) return;
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
    // Se depende de `hasInFlight` (un booleano derivado) y no del array: antes la
    // dependencia era `documents`, y como cada respuesta del poll creaba una identidad
    // nueva, el intervalo se destruía y se recreaba en cada vuelta.
  }, [hasInFlight, refresh]);

  if (state.status === 'loading') {
    return <p className="text-body text-muted-foreground">{common.loading}</p>;
  }
  if (state.status === 'error') {
    return <LoadError error={state.error} labels={common.loadError} onRetry={reload} />;
  }

  const documents = state.items;
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
            {/* La columna de acciones ya no depende solo de `canRevert`: reintentar es
              `upload_excel`, que tienen los tres roles de cliente. */}
            <TableHead />
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
              <TableCell>
                {/* Solo un documento promovido tiene filas que deshacer — el backend
                  responde 409 en cualquier otro estado. */}
                {canRevert && doc.status === 'promoted' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => revert(doc.id)}
                    disabled={reverting === doc.id}
                  >
                    {reverting === doc.id ? labels.reverting : labels.revert}
                  </Button>
                )}
                {doc.status === 'failed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => retry(doc.id)}
                    disabled={retrying === doc.id}
                  >
                    {retrying === doc.id ? labels.retrying : labels.retry}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
