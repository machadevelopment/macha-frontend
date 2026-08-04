'use client';

import { KpiCard } from '@/components/charts/kpi-card';
import { LoadError } from '@/components/ui/load-error';
import { request } from '@/lib/api/browser';
import { useResource } from '@/lib/api/use-resource';
import { formatMoney } from '@/lib/format';
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
    request<MetricsResponse>('/api/metrics?months=2'),
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

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 app:grid-cols-3">
      <KpiCard
        label={labels.revenue}
        value={formatMoney(latest?.revenue ?? 0, currency, locale)}
        delta={delta(latest?.revenue ?? 0, previous?.revenue)}
        locale={locale}
      />
      <KpiCard
        label={labels.cogs}
        value={formatMoney(latest?.cogs ?? 0, currency, locale)}
        delta={delta(latest?.cogs ?? 0, previous?.cogs)}
        invertDelta
        locale={locale}
      />
      <KpiCard
        label={labels.margin}
        value={formatMoney(latest?.margin ?? 0, currency, locale)}
        delta={delta(latest?.margin ?? 0, previous?.margin)}
        locale={locale}
      />
    </div>
  );
}
