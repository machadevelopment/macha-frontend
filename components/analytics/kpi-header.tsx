'use client';

import { ArrowUpRight, DollarSign, HandCoins, Percent, PiggyBank, Receipt } from 'lucide-react';
import { KpiCard } from '@/components/charts/kpi-card';
import { formatMoney, formatMoneyCompact, formatPct } from '@/lib/format';
import { delta, gastos, margenBruto, resultado, utilidadBruta } from '@/lib/metrics/period-totals';
import type { PeriodMetricsResponse, AgingBuckets } from '@/lib/api/dashboard';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * Fila de KPIs del encabezado de Analítica — CU-868kt29t0.
 *
 * Común a los seis tabs y no propia de cada uno: son las cifras ancla del período, y que
 * desaparezcan al cambiar de tab obligaría a volver al primero cada vez que alguien quiere
 * recordar de cuánto dinero se está hablando.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * UNA DESVIACIÓN DEL PROTOTIPO, DELIBERADA Y DOCUMENTADA
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *
 * El prototipo de Lovable pide seis tarjetas: Revenue, Costs, Gross Margin, **Cash Flow**,
 * **Profit** y Growth. Con el ledger que el producto tiene hoy, **Cash Flow y Profit son el
 * MISMO número**:
 *
 *   · el ledger tiene cuatro tipos de movimiento (`revenue`, `cogs`, `opex`, `other`) y los
 *     fecha por la fecha del movimiento, o sea que es de base ACUMULATIVA;
 *   · la utilidad del período es `revenue - cogs - opex`;
 *   · la caja del período, con esos mismos datos, es exactamente esa resta. Es lo que
 *     calcula `resultado()` en `lib/metrics/period-totals.ts`, cuyo propio comentario dice
 *     "es la caja del período, no el margen".
 *
 * Una caja de verdad distinta de la utilidad exige base de EFECTIVO: fechar por cuándo se
 * cobró y se pagó, no por cuándo se facturó. Los datos existen (`payments`, y la liquidación
 * de `invoices`/`bills`) pero ningún endpoint los expone por período, así que hoy no se
 * puede calcular.
 *
 * Poner dos tarjetas con el mismo número y nombres distintos es **peor que poner una**: en
 * un producto financiero el usuario asume que dos indicadores con nombres diferentes miden
 * cosas diferentes, y actuaría sobre esa diferencia inexistente. Así que:
 *
 *   · va UNA tarjeta, "Resultado", con la leyenda de qué resta;
 *   · el sexto lugar lo toma **Por cobrar abierto**, que es un dato real, distinto de todos
 *     los demás, y el más accionable que tiene una PYME (`/ar-ap`);
 *   · el TAB de Flujo de caja sí existe y muestra entradas contra salidas, que es una
 *     lectura legítima del mismo ledger — lo que no se puede es fingir que la caja y la
 *     utilidad son dos cifras.
 *
 * Queda anotado en el ticket para que Jose decida si quiere la caja de base efectivo, que
 * es trabajo de backend y de otro tamaño.
 */
export function AnalyticsKpiHeader({
  metricas,
  arApTotal,
  locale,
  labels,
  kpiLabels,
}: {
  metricas: PeriodMetricsResponse;
  /** Total de facturas por cobrar abiertas. `null` mientras carga o si `/ar-ap` falló. */
  arApTotal: number | null;
  locale: Locale;
  labels: Dictionary['analytics'];
  kpiLabels: Dictionary['dashboard']['kpi'];
}) {
  const moneda = (metricas.baseCurrency ?? 'GTQ') as 'GTQ' | 'USD';
  const actual = metricas.current;
  const previo = metricas.previous;

  const margen = margenBruto(actual);
  /**
   * Margen NETO: después de restar también el gasto operativo. Va como leyenda del bruto,
   * como en el prototipo ("Net: X%"), y no como tarjeta aparte — son el mismo indicador con
   * dos alcances, y en tarjetas separadas se leen como dos métricas distintas.
   *
   * `null` sin ventas por la misma razón que el bruto: un "0.0%" ahí se lee como "vendiste
   * sin ganar" en vez de "no vendiste".
   */
  const margenNeto = actual.revenue === 0 ? null : resultado(actual) / actual.revenue;
  const crecimiento = delta(actual.revenue, previo.revenue);

  /** Seis tarjetas: 3 columnas en pantalla media, 6 en la ancha del `app`. */
  const GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-3 app:grid-cols-6';

  return (
    <div className={GRID}>
      <KpiCard
        label={kpiLabels.revenue}
        icon={<DollarSign className="h-4 w-4" strokeWidth={1.7} />}
        value={formatMoneyCompact(actual.revenue, moneda, locale)}
        exact={formatMoney(actual.revenue, moneda, locale)}
        delta={crecimiento}
        deltaCaption={kpiLabels.vsPrevious}
        locale={locale}
      />
      <KpiCard
        label={kpiLabels.expenses}
        icon={<Receipt className="h-4 w-4" strokeWidth={1.7} />}
        value={formatMoneyCompact(gastos(actual), moneda, locale)}
        exact={formatMoney(gastos(actual), moneda, locale)}
        delta={delta(gastos(actual), gastos(previo))}
        deltaCaption={kpiLabels.vsPrevious}
        // Un gasto que sube no es buena noticia: el chip va rojo aunque la flecha suba.
        invertDelta
        locale={locale}
      />
      <KpiCard
        label={labels.header.grossMargin}
        icon={<Percent className="h-4 w-4" strokeWidth={1.7} />}
        // Sin delta a propósito: la variación de un porcentaje ya es un porcentaje, y
        // "+12% sobre un 35%" no dice si subió 12 puntos o hasta 39,2%.
        value={margen === null ? '—' : formatPct(margen, locale)}
        hint={
          margenNeto === null
            ? kpiLabels.marginHint
            : `${labels.header.netMargin}: ${formatPct(margenNeto, locale)}`
        }
        locale={locale}
      />
      <KpiCard
        label={kpiLabels.grossProfit}
        icon={<PiggyBank className="h-4 w-4" strokeWidth={1.7} />}
        value={formatMoneyCompact(utilidadBruta(actual), moneda, locale)}
        exact={formatMoney(utilidadBruta(actual), moneda, locale)}
        delta={delta(utilidadBruta(actual), utilidadBruta(previo))}
        deltaCaption={kpiLabels.vsPrevious}
        locale={locale}
      />
      <KpiCard
        label={labels.header.result}
        icon={<ArrowUpRight className="h-4 w-4" strokeWidth={1.7} />}
        value={formatMoneyCompact(resultado(actual), moneda, locale)}
        exact={formatMoney(resultado(actual), moneda, locale)}
        delta={delta(resultado(actual), resultado(previo))}
        deltaCaption={kpiLabels.vsPrevious}
        hint={labels.header.resultHint}
        locale={locale}
      />
      <KpiCard
        label={labels.header.arOpen}
        icon={<HandCoins className="h-4 w-4" strokeWidth={1.7} />}
        // `null` mientras `/ar-ap` no responde: un cero acá diría "no te deben nada", que es
        // una afirmación, no una ausencia de dato.
        value={arApTotal === null ? '—' : formatMoneyCompact(arApTotal, moneda, locale)}
        exact={arApTotal === null ? undefined : formatMoney(arApTotal, moneda, locale)}
        hint={labels.header.arOpenHint}
        locale={locale}
      />
    </div>
  );
}

/** Suma de los cinco tramos. Vive acá porque el encabezado es su único consumidor. */
export function totalDeCartera(buckets: AgingBuckets): number {
  return Object.values(buckets).reduce((s, v) => s + v, 0);
}
