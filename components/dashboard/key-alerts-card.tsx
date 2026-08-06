'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { request } from '@/lib/api/browser';
import { useResource } from '@/lib/api/use-resource';
import { formatDate, formatNumber } from '@/lib/format';
import { RULE_UNIT, isKnownRule } from '@/lib/alerts/rule-units';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * Alertas activas, en el rail del dashboard.
 *
 * POR QUÉ ALERTAS Y NO INSIGHTS DE IA. El rail del prototipo "MVP Macha" muestra tarjetas
 * de consejo financiero redactadas por IA. Reproducirlas literalmente significaría generar
 * insights en cada carga del dashboard, y `insight` es el ÚNICO tipo de llamada que debita
 * créditos del cliente (CLAUDE.md): un rail que se autogenera le cobraría a cada visita a
 * su propia pantalla principal, sin que nadie lo haya pedido. Eso es una decisión de
 * facturación, no de maquetado, así que no se toma acá.
 *
 * Lo que sí hay es `alert_events`, que el motor de alertas ya calcula solo (`evaluateAlerts`
 * tras cada promoción) y que NO cuesta un token: mismo tipo de contenido —cartera vencida,
 * caída de ventas, margen— con datos reales y a costo cero. El insight de IA sigue en el
 * rail, arriba, pero bajo demanda y con su botón, como estaba.
 *
 * Es el bloque "KEY ALERTS" del prototipo, que ahí convive con las tarjetas de consejo.
 */
interface AlertRow {
  id: string;
  ruleKey: string;
  /** `numeric` en Postgres: llega como string decimal y se muestra sin pasar por
   * parseFloat (regla no negociable de precisión en cifras). */
  threshold: string;
  triggeredValue: string;
  createdAt: string;
}

/** Cuántas caben en el rail sin volverlo un listado. El histórico completo vive en `/alerts`. */
const CUANTAS = 4;

export function KeyAlertsCard({
  locale,
  labels,
  alertLabels,
  common,
}: {
  locale: Locale;
  labels: Dictionary['dashboard']['keyAlerts'];
  /** Etiquetas de regla/unidad: son las MISMAS que usan `/alerts` y el detalle. */
  alertLabels: Dictionary['alerts'];
  common: Dictionary['common'];
}) {
  const { state } = useResource<{ items: AlertRow[]; hasMore: boolean }>(
    () => request<{ items: AlertRow[]; hasMore: boolean }>(`/api/alerts?limit=${CUANTAS}&offset=0`),
    [],
  );

  return (
    <Card>
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.7} />
        <p className="font-mono text-eyebrow uppercase text-faint">{labels.title}</p>
      </div>

      {state.status === 'loading' && <p className="text-body text-faint">{common.loading}</p>}

      {/* Un fallo NO se degrada a "no tenés alertas": decirle a alguien que su negocio está
          tranquilo cuando en realidad no se pudo cargar es el peor de los dos errores
          posibles en un producto financiero. Mismo criterio que `/alerts`. */}
      {state.status === 'error' && <p className="text-body text-danger">{labels.loadFailed}</p>}

      {state.status === 'ready' && state.data.items.length === 0 && (
        <p className="text-body text-faint">{labels.empty}</p>
      )}

      {state.status === 'ready' && state.data.items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {state.data.items.map((a) => (
            <li key={a.id} className="border-t border-border pt-2 first:border-t-0 first:pt-0">
              <Link href={`/alerts/${a.id}`} className="group block">
                <div className="flex items-center justify-between gap-2">
                  {/* Una regla que exista en el backend pero todavía no en el diccionario se
                      degrada a mostrar su clave cruda, nunca a romper la fila. */}
                  <Badge variant="danger" className="normal-case">
                    {isKnownRule(a.ruleKey) ? alertLabels.rule[a.ruleKey] : a.ruleKey}
                  </Badge>
                  <span className="font-mono tabular-nums text-eyebrow text-faint">
                    {formatDate(a.createdAt, locale)}
                  </span>
                </div>
                <p className="mt-1 font-ui text-body text-muted-foreground group-hover:text-foreground">
                  {labels.triggered
                    .replace('{value}', formatNumber(a.triggeredValue, locale, 1))
                    .replace('{threshold}', formatNumber(a.threshold, locale, 1))
                    .replace(
                      '{unit}',
                      isKnownRule(a.ruleKey) ? alertLabels.unit[RULE_UNIT[a.ruleKey]] : '',
                    )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {state.status === 'ready' && state.data.items.length > 0 && (
        <Link
          href="/alerts"
          className="mt-3 inline-block font-ui text-body text-muted-foreground underline hover:text-foreground"
        >
          {labels.seeAll}
        </Link>
      )}
    </Card>
  );
}
