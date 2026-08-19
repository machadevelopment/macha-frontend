'use client';

import { useCallback } from 'react';
import Link from 'next/link';
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
import { RULE_UNIT, isKnownRule } from '@/lib/alerts/rule-units';
import { formatAlertValue } from '@/lib/alerts/format-alert-value';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * CU-868kj0tdq: histórico de alertas.
 *
 * `GET /alerts` existe en el backend desde CU-868kfvad3 y nadie lo consumía. Hasta hoy,
 * la única forma de ver una alerta era conservar el email con el deep-link a
 * `/alerts/<id>`: borrado el correo, la alerta quedaba irrecuperable desde la app
 * aunque siguiera guardada en `alert_events`. El PRD §8 compromete "histórico completo".
 */
interface AlertRow {
  id: string;
  ruleKey: string;
  /** `numeric` en Postgres — llega como string decimal, nunca como number. No se pasa
   * por parseFloat para mostrarlo (regla no negociable de dinero/precisión). */
  threshold: string;
  triggeredValue: string;
  createdAt: string;
}

const PAGE_SIZE = 50;

export function AlertList({
  locale,
  labels,
  common,
}: {
  locale: Locale;
  labels: Dictionary['alerts'];
  common: Dictionary['common'];
}) {
  // Mismo patrón "cargar más" (limit+1 del backend) que reportes y documentos: el tick
  // diario del motor de alertas hace que esta lista crezca sin techo.
  //
  // CU-868kkgb3c: un fallo dejaba `alerts` en `null` y la pantalla mostraba lo mismo que
  // "no se ha disparado ninguna alerta". En un histórico de alertas financieras decirle a
  // alguien que no tiene ninguna cuando en realidad no se pudieron cargar es el peor de
  // los dos errores posibles.
  const { state, loadMore, loadingMore, moreError, reload } = usePagedList<AlertRow>(
    useCallback(
      (offset) =>
        request<{ items: AlertRow[]; hasMore: boolean }>(
          `/api/alerts?limit=${PAGE_SIZE}&offset=${offset}`,
        ),
      [],
    ),
  );

  if (state.status === 'loading') {
    return <p className="text-body text-muted-foreground">{common.loading}</p>;
  }
  if (state.status === 'error') {
    return <LoadError error={state.error} labels={common.loadError} onRetry={reload} />;
  }

  const alerts = state.items;
  if (alerts.length === 0) return <p className="text-body text-muted-foreground">{labels.empty}</p>;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{labels.table.rule}</TableHead>
            <TableHead>{labels.table.triggeredValue}</TableHead>
            <TableHead>{labels.table.threshold}</TableHead>
            <TableHead>{labels.table.date}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((a) => {
            // El backend manda `ruleKey` (estable) y nunca el label ni la unidad: su
            // catálogo solo tiene textos en español y la UI es ES/EN. Una regla que
            // exista allá pero todavía no acá se degrada a mostrar la clave cruda sin
            // unidad — nunca a romper la fila.
            const key = a.ruleKey;
            const label = isKnownRule(key) ? labels.rule[key] : key;
            const unit = isKnownRule(key) ? labels.unit[RULE_UNIT[key]] : '';
            /*
             * CU-868ktkjv4: los decimales salen de la UNIDAD, no del gusto. Antes se
             * imprimía el `numeric(18,4)` tal como llega —"52.2850 %"— saltándose el
             * sistema de formato entero, incluido el separador decimal del locale.
             * Una regla desconocida no tiene unidad, y ahí un porcentaje es la
             * suposición menos mala: todas las reglas del catálogo menos una lo son.
             */
            const fmt = (v: string) =>
              formatAlertValue(v, isKnownRule(key) ? RULE_UNIT[key] : 'percent', locale);
            return (
              <TableRow key={a.id}>
                <TableCell>
                  <Link href={`/alerts/${a.id}`} className="text-body underline">
                    {label}
                  </Link>
                </TableCell>
                <TableCell className="tabular-nums">
                  {fmt(a.triggeredValue)} {unit}
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {fmt(a.threshold)} {unit}
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {formatDate(a.createdAt, locale)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {/* El fallo de una página siguiente no borra lo ya cargado (ver `usePagedList`). */}
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
