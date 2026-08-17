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
import { Badge } from '@/components/ui/badge';
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
  /**
   * CU-868krw2wn: si el reporte tiene contenido.
   *
   * La fila de `reports` se crea ANTES de generar la narrativa —el backend necesita
   * devolver un id para que el cliente consulte el estado—, así que una generación que
   * falla deja una fila sin versión. Hasta este ticket esa fila se pintaba idéntica a una
   * buena y al abrirla daba "no encontrado", que es falso: el reporte existe, lo que no
   * existe es su contenido.
   *
   * Opcional en el tipo por si la respuesta viene de un backend anterior al despliegue;
   * `!== false` de abajo hace que la ausencia se lea como "listo", que es el comportamiento
   * de antes y el correcto para todo el histórico ya generado.
   */
  ready?: boolean;
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
            <TableHead>{labels.table.status}</TableHead>
            <TableHead>{labels.table.updated}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((r) => {
            const listo = r.ready !== false;
            const periodo = `${formatDate(r.periodStart, locale)} — ${formatDate(r.periodEnd, locale)}`;
            return (
              <TableRow key={r.id}>
                <TableCell>
                  {/* Sin enlace cuando no hay contenido: el detalle responde "no
                      encontrado" para estas filas, así que ofrecer el clic es mandar al
                      usuario a un error. El período se sigue mostrando —es lo que le dice
                      cuál período le falta— pero en tinta apagada. */}
                  {listo ? (
                    <a href={`/reports/${r.id}`} className="tabular-nums underline">
                      {periodo}
                    </a>
                  ) : (
                    <span className="tabular-nums text-muted-foreground">{periodo}</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-eyebrow uppercase text-faint">
                  {r.frequency}
                </TableCell>
                <TableCell>
                  {/* `danger` y no `warning`: para el usuario esto no es una advertencia
                      sobre algo que igual sirve, es un reporte que no tiene. Y el chip
                      lleva texto+fondo+borde, nunca solo color (design guide §1 regla 3). */}
                  {listo ? (
                    <Badge variant="success">{labels.status.ready}</Badge>
                  ) : (
                    <Badge variant="danger" title={labels.status.notGeneratedHint}>
                      {labels.status.notGenerated}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {formatDate(r.updatedAt, locale)}
                </TableCell>
              </TableRow>
            );
          })}
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
