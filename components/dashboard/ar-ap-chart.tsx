'use client';

import { BarChart } from '@tremor/react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { request } from '@/lib/api/browser';
import { useResource } from '@/lib/api/use-resource';
import { formatMoney, formatMoneyCompact } from '@/lib/format';
import { makeChartTooltip } from '@/components/charts/chart-tooltip';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { ArApResponse } from '@/lib/api/dashboard';
import { chartColors } from '@/components/charts/chart-theme';

const BUCKET_ORDER = ['current', '1_30', '31_60', '61_90', '90_plus'] as const;

export function ArApChart({
  locale,
  title,
  arLabel,
  apLabel,
  agingLabel,
  common,
}: {
  locale: Locale;
  title: string;
  arLabel: string;
  apLabel: string;
  /** CU-868kh8rz8: cabecera de la tabla `sr-only`, hardcodeada en español por el PR #19. */
  agingLabel: string;
  common: Dictionary['common'];
}) {
  const { state, reload } = useResource<ArApResponse>(() => request<ArApResponse>('/api/ar-ap'));

  // CU-868kkgb3c: ver nota en trend-chart.tsx — la tarjeta no desaparece, falla adentro.
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

  const chartData = BUCKET_ORDER.map((bucket) => ({
    bucket,
    [arLabel]: data.ar[bucket],
    [apLabel]: data.ap[bucket],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <BarChart
        data={chartData}
        index="bucket"
        categories={[arLabel, apLabel]}
        colors={[chartColors.neutral, chartColors.negative]}
        // CU-868khvyqa: ver nota en trend-chart.tsx — eje compacto, tooltip exacto.
        valueFormatter={(v: number) => formatMoneyCompact(v, currency, locale)}
        customTooltip={makeChartTooltip(currency, locale)}
        yAxisWidth={72}
        className="h-64 font-mono text-eyebrow"
        showLegend
      />
      {/* Alternativa accesible: el SVG del chart no expone los valores a lectores de
          pantalla — CU-868kfvaz9. */}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>{agingLabel}</th>
            <th>{arLabel}</th>
            <th>{apLabel}</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((row) => (
            <tr key={row.bucket}>
              <td>{row.bucket}</td>
              <td>{formatMoney(row[arLabel] as number, currency, locale)}</td>
              <td>{formatMoney(row[apLabel] as number, currency, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
