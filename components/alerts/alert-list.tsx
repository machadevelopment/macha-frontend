'use client';

import { useEffect, useState } from 'react';
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
import { formatDate } from '@/lib/format';
import { RULE_UNIT, isKnownRule } from '@/lib/alerts/rule-units';
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

export function AlertList({ locale, labels }: { locale: Locale; labels: Dictionary['alerts'] }) {
  const [alerts, setAlerts] = useState<AlertRow[] | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Mismo patrón "cargar más" (limit+1 del backend) que reportes y documentos: el tick
  // diario del motor de alertas hace que esta lista crezca sin techo.
  function load(offset = 0) {
    fetch(`/api/alerts?limit=${PAGE_SIZE}&offset=${offset}`)
      .then((r) => r.json())
      .then((data: { items: AlertRow[]; hasMore: boolean }) => {
        setAlerts((prev) => (offset === 0 ? data.items : [...(prev ?? []), ...data.items]));
        setHasMore(data.hasMore);
      });
  }

  useEffect(() => load(0), []);

  if (!alerts) return null;
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
            return (
              <TableRow key={a.id}>
                <TableCell>
                  <Link href={`/alerts/${a.id}`} className="text-body underline">
                    {label}
                  </Link>
                </TableCell>
                <TableCell className="font-mono tabular-nums">
                  {a.triggeredValue} {unit}
                </TableCell>
                <TableCell className="font-mono tabular-nums text-muted-foreground">
                  {a.threshold} {unit}
                </TableCell>
                <TableCell className="font-mono tabular-nums text-muted-foreground">
                  {formatDate(a.createdAt, locale)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {hasMore && (
        <Button size="sm" variant="outline" className="mt-3" onClick={() => load(alerts.length)}>
          {labels.loadMore}
        </Button>
      )}
    </>
  );
}
