'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { request } from '@/lib/api/browser';
import { useResource } from '@/lib/api/use-resource';
import { formatMoney } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { ArApResponse } from '@/lib/api/dashboard';
import { chartColors } from '@/components/charts/chart-theme';
import { CategoryBars } from '@/components/charts/chart-primitives';

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
      {/* CU-868knx0vh: ver nota en trend-chart.tsx. Barras y no área porque el eje X acá
          no es tiempo sino tramos de antigüedad — una curva entre "31-60" y "61-90"
          sugeriría una continuidad que no existe. Lo que sí se comparte con la tendencia
          es el cromo: eje, grid, cursor y leyenda salen del mismo lugar. */}
      <CategoryBars
        data={chartData}
        index="bucket"
        categories={[arLabel, apLabel]}
        colors={[chartColors.neutral, chartColors.negative]}
        currency={currency}
        locale={locale}
        yAxisWidth={72}
        className="h-64"
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
