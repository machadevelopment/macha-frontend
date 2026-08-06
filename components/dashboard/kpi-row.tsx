'use client';

import { DollarSign, Receipt, PiggyBank, Percent, Wallet } from 'lucide-react';
import { KpiCard } from '@/components/charts/kpi-card';
import { LoadError } from '@/components/ui/load-error';
import { request } from '@/lib/api/browser';
import { useResource } from '@/lib/api/use-resource';
import { formatMoney, formatPct } from '@/lib/format';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';
import type { MetricsResponse } from '@/lib/api/dashboard';

export function KpiRow({
  locale,
  labels,
  common,
}: {
  locale: Locale;
  labels: Dictionary['dashboard']['kpi'];
  /** CU-868kkgb3c:  y los textos del estado de fallo, para no dejar la fila en blanco. */
  common: Dictionary['common'];
}) {
  const { state, reload } = useResource<MetricsResponse>(() =>
    request<MetricsResponse>('/api/metrics?months=12'),
  );

  // Cinco tarjetas como el prototipo: ventas, gastos, utilidad, margen y flujo.
  const GRID = 'grid grid-cols-1 gap-3 sm:grid-cols-2 app:grid-cols-3 xl:grid-cols-5';

  if (state.status === 'loading') {
    return (
      <div className={GRID}>
        {[0, 1, 2, 3, 4].map((i) => (
          <KpiCard key={i} label="" value="" loading />
        ))}
      </div>
    );
  }

  // CU-868kkgb3c: antes este caso era indistinguible del anterior — un `null` que dejaba
  // las tres tarjetas en "cargando" para siempre. Y tres KPIs vacíos en un dashboard
  // financiero no se leen como un vacío, se leen como "no hubo ingresos".
  if (state.status === 'error') {
    return <LoadError error={state.error} labels={common.loadError} onRetry={reload} />;
  }

  const data = state.data;
  const currency = data.baseCurrency as 'GTQ' | 'USD';
  const latest = data.months[data.months.length - 1];
  const previous = data.months[data.months.length - 2];

  function delta(current: number, prior?: number): number | undefined {
    if (prior === undefined || prior === 0) return undefined;
    return (current - prior) / Math.abs(prior);
  }

  /**
   * Serie para el sparkline. Son los mismos meses que ya venían en la respuesta — antes
   * se pedían 2 (solo para el delta) y ahora 12, que es lo que hace falta para que la
   * línea tenga forma. No es un dato nuevo ni una llamada extra.
   */
  const serie = (campo: 'revenue' | 'cogs' | 'grossProfit') => data.months.map((m) => m[campo]);

  /**
   * "Gastos" del prototipo = costo directo + gasto operativo. Es la cifra que un dueño
   * entiende por "lo que me costó operar", y sale de dos campos que ya vienen separados
   * en la respuesta — no es un dato nuevo.
   */
  const gastos = (m?: { cogs: number; opex: number }) => (m ? m.cogs + m.opex : 0);
  const serieGastos = data.months.map((m) => m.cogs + m.opex);

  /**
   * Flujo del período = ingresos − gastos totales. NO es lo mismo que la utilidad bruta
   * que manda el KPI de margen (CU-868kh8y58, decisión de Jose: el margen del producto
   * es BRUTO, sin restar opex). Se muestran los dos porque responden preguntas
   * distintas —"cuánto me deja cada venta" vs "cuánto me quedó en el bolsillo"— y cada
   * tarjeta dice de dónde sale su número para que no se confundan.
   */
  const flujo = (m?: { revenue: number; cogs: number; opex: number }) =>
    m ? m.revenue - (m.cogs + m.opex) : 0;
  const serieFlujo = data.months.map((m) => m.revenue - (m.cogs + m.opex));

  return (
    <div className={GRID}>
      <KpiCard
        label={labels.revenue}
        icon={<DollarSign className="h-4 w-4" strokeWidth={1.7} />}
        value={formatMoney(latest?.revenue ?? 0, currency, locale)}
        hint={labels.revenueHint}
        delta={delta(latest?.revenue ?? 0, previous?.revenue)}
        deltaCaption={labels.vsPrevious}
        spark={serie('revenue')}
        locale={locale}
      />
      <KpiCard
        label={labels.expenses}
        icon={<Receipt className="h-4 w-4" strokeWidth={1.7} />}
        value={formatMoney(gastos(latest), currency, locale)}
        hint={labels.expensesHint}
        delta={delta(gastos(latest), previous ? gastos(previous) : undefined)}
        deltaCaption={labels.vsPrevious}
        spark={serieGastos}
        invertDelta
        locale={locale}
      />
      {/* CU-868kh8y58 — el par que tiene que cuadrar. La cifra grande es la UTILIDAD
          BRUTA (ingresos − costo directo) y el porcentaje sale de esos mismos dos
          números, los dos calculados en el backend por la misma función. El bug del
          ticket era exactamente esto al revés: una ganancia que restaba gastos junto a
          un margen que no, contradiciéndose en la misma pantalla. */}
      <KpiCard
        label={labels.grossProfit}
        icon={<PiggyBank className="h-4 w-4" strokeWidth={1.7} />}
        value={formatMoney(latest?.grossProfit ?? 0, currency, locale)}
        hint={labels.grossProfitHint}
        delta={delta(latest?.grossProfit ?? 0, previous?.grossProfit)}
        deltaCaption={labels.vsPrevious}
        spark={serie('grossProfit')}
        locale={locale}
      />
      <KpiCard
        label={labels.margin}
        icon={<Percent className="h-4 w-4" strokeWidth={1.7} />}
        // `null` = período sin ventas. No hay margen que mostrar, y un "0.0%" ahí se
        // leería como "vendiste sin ganar" en vez de "no vendiste".
        value={
          latest?.grossMarginPct == null ? '—' : formatPct(latest.grossMarginPct / 100, locale)
        }
        hint={labels.marginHint}
        deltaCaption={labels.vsPrevious}
        locale={locale}
      />
      <KpiCard
        label={labels.cashFlow}
        icon={<Wallet className="h-4 w-4" strokeWidth={1.7} />}
        value={formatMoney(flujo(latest), currency, locale)}
        hint={labels.cashFlowHint}
        delta={delta(flujo(latest), previous ? flujo(previous) : undefined)}
        deltaCaption={labels.vsPrevious}
        spark={serieFlujo}
        locale={locale}
      />
    </div>
  );
}
