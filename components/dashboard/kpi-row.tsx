'use client';

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

  if (state.status === 'loading') {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 app:grid-cols-3">
        <KpiCard label={labels.revenue} value="" loading />
        <KpiCard label={labels.cogs} value="" loading />
        <KpiCard label={labels.margin} value="" loading />
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

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 app:grid-cols-3">
      <KpiCard
        label={labels.revenue}
        value={formatMoney(latest?.revenue ?? 0, currency, locale)}
        delta={delta(latest?.revenue ?? 0, previous?.revenue)}
        spark={serie('revenue')}
        locale={locale}
      />
      <KpiCard
        label={labels.cogs}
        value={formatMoney(latest?.cogs ?? 0, currency, locale)}
        delta={delta(latest?.cogs ?? 0, previous?.cogs)}
        spark={serie('cogs')}
        invertDelta
        locale={locale}
      />
      {/* CU-868kh8y58 — el par que tiene que cuadrar. La cifra grande es la UTILIDAD
          BRUTA (ingresos − costo directo) y el porcentaje sale de esos mismos dos
          números, los dos calculados en el backend por la misma función. El bug del
          ticket era exactamente esto al revés: una ganancia que restaba gastos junto a
          un margen que no, contradiciéndose en la misma pantalla. */}
      <KpiCard
        label={labels.margin}
        value={formatMoney(latest?.grossProfit ?? 0, currency, locale)}
        secondary={
          // `null` = período sin ventas. No hay margen que mostrar, y un "0.0%" ahí
          // se leería como "vendiste sin ganar" en vez de "no vendiste".
          latest?.grossMarginPct == null
            ? undefined
            : formatPct(latest.grossMarginPct / 100, locale)
        }
        hint={labels.marginHint}
        delta={delta(latest?.grossProfit ?? 0, previous?.grossProfit)}
        spark={serie('grossProfit')}
        locale={locale}
      />
    </div>
  );
}
