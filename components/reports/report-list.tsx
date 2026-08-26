'use client';

import { useCallback, useEffect } from 'react';
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
  /**
   * CU-868ktkuq0: el estado REAL, con tres valores.
   *
   * `ready` no alcanzaba: su ausencia significaba a la vez "todavía se está generando" y
   * "ya no se va a generar", y esta lista tenía que elegir uno para pintar ese caso.
   * Elegía "falló", así que todo reporte recién pedido salía en rojo — la fila se crea
   * ANTES de encolar el job, o sea que ese es el estado normal, no el excepcional.
   *
   * Opcional por la ventana de despliegue en que el frontend va adelante del backend: si
   * no viene, se cae a `ready` y el comportamiento es el de antes.
   */
  status?: 'ready' | 'generating' | 'failed';
}

const PAGE_SIZE = 50;
/** Techo que el backend aplica a `limit` (CU-868kh913c). */
const MAX_PAGE = 200;

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * POLLING CONDICIONAL: SOLO MIENTRAS HAYA UN REPORTE GENERÁNDOSE
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Jose reportó que un reporte recién pedido se queda en "generando" hasta refrescar la pantalla
 * o salir del módulo y volver. La parte visual ya estaba completa —esta tabla pinta los tres
 * estados con su badge— pero nada volvía a pedir la lista.
 *
 * `reports-screen.tsx` documentaba por qué no había polling, y el argumento era bueno: *"un
 * `setInterval` contra el historial gastaría requests de todos los usuarios que dejen la
 * pestaña abierta para cubrir el caso de uno que está esperando."*
 *
 * Eso descarta un polling INCONDICIONAL, no este. El intervalo solo existe mientras alguna fila
 * visible está en `generating`, y se apaga solo en cuanto no queda ninguna: un usuario con la
 * pestaña abierta sobre reportes ya terminados no gasta ni una petición. El caso que se cubre
 * dura lo que dura una generación.
 *
 * Es el MISMO mecanismo que `document-list.tsx` ya usa para las cargas en vuelo, con el mismo
 * intervalo y las mismas dos precauciones que ahí costaron un arreglo:
 *
 *   · se refresca con `replace`, no con `reload`: `reload` vuelve al estado de carga y perdería
 *     las páginas que el usuario ya trajo con "cargar más";
 *   · la dependencia del efecto es un BOOLEANO derivado y no el array de filas — con el array,
 *     cada respuesta del poll crea una identidad nueva y el intervalo se destruye y se recrea
 *     en cada vuelta.
 *
 * Y si el poll falla no se toca nada: un refresco caído no debe vaciar la tabla ni avisarle al
 * usuario cada cuatro segundos de algo que no tiene que atender.
 */
const POLL_MS = 4000;

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
  const { state, loadMore, loadingMore, moreError, reload, replace } = usePagedList<ReportRow>(
    useCallback(async (offset) => {
      const result = await request<{ reports: ReportRow[]; hasMore: boolean }>(
        `/api/reports?limit=${PAGE_SIZE}&offset=${offset}`,
      );
      return result.ok
        ? { ok: true as const, data: { items: result.data.reports, hasMore: result.data.hasMore } }
        : result;
    }, []),
  );

  const shown = state.status === 'ready' ? state.items.length : 0;

  const refresh = useCallback(() => {
    const limit = Math.min(Math.max(shown, PAGE_SIZE), MAX_PAGE);
    void request<{ reports: ReportRow[]; hasMore: boolean }>(
      `/api/reports?limit=${limit}&offset=0`,
    ).then((result) => {
      if (result.ok) replace(result.data.reports, result.data.hasMore);
    });
  }, [shown, replace]);

  /*
   * `status === 'generating'` y no "le falta `ready`": esa ausencia significaba a la vez
   * "generándose" y "falló", y sondear a un reporte fallido sería sondear para siempre.
   */
  const generando = state.status === 'ready' && state.items.some((r) => r.status === 'generating');

  useEffect(() => {
    if (!generando) return;
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [generando, refresh]);

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
            // El backend nuevo manda `status`; si no está (backend viejo), se deriva del
            // booleano de siempre. Nunca se asume "generándose" sin dato: sin `status`, un
            // reporte sin versión es el caso que ya conocíamos.
            const estado = r.status ?? (r.ready !== false ? 'ready' : 'failed');
            const listo = estado === 'ready';
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
                  {estado === 'ready' && <Badge variant="success">{labels.status.ready}</Badge>}
                  {/* `neutral` y no `warning`: generándose no es una advertencia sobre nada,
                      es el curso normal. Pintarlo de color de aviso volvería a decirle al
                      usuario que algo va mal cuando no va mal. */}
                  {estado === 'generating' && (
                    <Badge variant="neutral" title={labels.status.generatingHint}>
                      {labels.status.generating}
                    </Badge>
                  )}
                  {estado === 'failed' && (
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
