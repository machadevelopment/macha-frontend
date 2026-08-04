'use client';

import { AreaChart } from '@tremor/react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { request } from '@/lib/api/browser';
import { useResource } from '@/lib/api/use-resource';
import { formatMoney, formatMoneyCompact } from '@/lib/format';
import { makeChartTooltip } from '@/components/charts/chart-tooltip';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { MetricsResponse } from '@/lib/api/dashboard';
import { chartColors } from '@/components/charts/chart-theme';

export function TrendChart({
  locale,
  title,
  labels,
  common,
}: {
  locale: Locale;
  title: string;
  /** CU-868kh8rz8: las cabeceras de la tabla `sr-only` se hardcodearon en español en el
   * PR #19 (a11y). Un lector de pantalla SÍ las lee, así que son texto de cara al
   * cliente y tienen que pasar por el diccionario como cualquier otro. */
  labels: Dictionary['dashboard'];
  common: Dictionary['common'];
}) {
  const { state, reload } = useResource<MetricsResponse>(() =>
    request<MetricsResponse>('/api/metrics?months=12'),
  );

  // CU-868kkgb3c: `if (!data) return null` borraba la tarjeta entera del dashboard —
  // ni el título quedaba. La tarjeta y su encabezado se mantienen siempre, y adentro va
  // el estado que corresponda: así el usuario ve QUÉ no cargó, no un hueco.
  if (state.status !== 'ready') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        {state.status === 'error' ? (
          <LoadError error={state.error} labels={common.loadError} onRetry={reload} />
        ) : (
          <div className="h-64" aria-busy="true" />
        )}
      </Card>
    );
  }

  const data = state.data;
  const currency = data.baseCurrency as 'GTQ' | 'USD';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <AreaChart
        data={data.months}
        index="period"
        categories={['revenue', 'cogs', 'margin']}
        colors={[chartColors.neutral, chartColors.negative, chartColors.positive]}
        // CU-868khvyqa: el eje va compacto o se recorta a "000.00"; el monto completo
        // vive en el tooltip, porque `valueFormatter` alimenta a los dos.
        valueFormatter={(v: number) => formatMoneyCompact(v, currency, locale)}
        customTooltip={makeChartTooltip(currency, locale)}
        yAxisWidth={72}
        className="h-64 font-mono text-eyebrow"
        showLegend
        showGridLines
      />
      {/* Alternativa accesible: el SVG del chart (Tremor/Recharts) no expone los
          valores a lectores de pantalla — CU-868kfvaz9. */}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>{labels.chart.period}</th>
            <th>{labels.kpi.revenue}</th>
            <th>{labels.kpi.cogs}</th>
            <th>{labels.kpi.margin}</th>
          </tr>
        </thead>
        <tbody>
          {data.months.map((m) => (
            <tr key={m.period}>
              <td>{m.period}</td>
              <td>{formatMoney(m.revenue, currency, locale)}</td>
              <td>{formatMoney(m.cogs, currency, locale)}</td>
              <td>{formatMoney(m.margin, currency, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
