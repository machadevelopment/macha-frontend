'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { request } from '@/lib/api/browser';
import { useResource } from '@/lib/api/use-resource';
import { formatMoney } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { MetricsResponse } from '@/lib/api/dashboard';
import { chartColors } from '@/components/charts/chart-theme';
import { TrendArea } from '@/components/charts/chart-primitives';

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
      {/*
        CU-868knx0vh: pasa por `TrendArea` en vez de montar el `AreaChart` de Tremor a
        mano. De ahí salen ahora el degradado bajo la curva, la curva suave, el formato
        compacto del eje con el tooltip exacto (CU-868khvyqa) y el estilo de eje/grid —
        antes esta pantalla tenía su propia combinación y no coincidía con Analítica.

        El `font-mono` del eje SE VA: la regla mono revisada reserva la monoespaciada para
        eyebrows y labels, nunca para cifras. Las marcas del eje ya salen con la tipografía
        de interfaz y `tabular-nums` desde `.macha-chart`.
      */}
      <TrendArea
        data={data.months}
        index="period"
        categories={['revenue', 'cogs', 'margin']}
        colors={[chartColors.neutral, chartColors.negative, chartColors.positive]}
        currency={currency}
        locale={locale}
        yAxisWidth={72}
        className="h-64"
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
