'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { request } from '@/lib/api/browser';
import { useResource } from '@/lib/api/use-resource';
import { formatMoney } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { PeriodMetricsResponse } from '@/lib/api/dashboard';
import { usePeriodScope } from '@/components/dashboard/period-scope';
import { utilidadBruta } from '@/lib/metrics/period-totals';
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
  /*
   * ═══ CU-868kt8x90: LA TENDENCIA SIGUE AL PERÍODO ═══
   *
   * Macha reportó que al cambiar a "hoy" o "esta semana" la gráfica se queda en mensual.
   * No era un problema de GRANULARIDAD: esta tarjeta pedía `/api/metrics?months=12` y
   * **no leía el filtro en absoluto**. Mostraba los últimos 12 meses pasara lo que pasara
   * con el selector — así que "hoy" y "este año" pintaban exactamente la misma curva.
   *
   * Ahora se pide `/api/metrics/period`, el mismo endpoint que ya alimenta los KPIs de
   * arriba y la tendencia de Analítica. Devuelve una SERIE DIARIA del rango exacto, así
   * que la granularidad sale sola: un día para "hoy", siete para "esta semana", los del
   * mes para "este mes". Cero lógica de granularidad que mantener — y de paso la curva y
   * las tarjetas de KPI pasan a leer del mismo sitio, que es lo que impide que cuenten
   * historias distintas.
   *
   * `rango` en las dependencias del `useResource` es lo que hace que se vuelva a pedir al
   * cambiar de filtro. Sin eso el efecto correría una vez y el bug seguiría, solo que con
   * otro endpoint.
   */
  const { rango } = usePeriodScope();
  const { state, reload } = useResource<PeriodMetricsResponse>(
    () => request<PeriodMetricsResponse>(`/api/metrics-period?from=${rango.from}&to=${rango.to}`),
    [rango.from, rango.to],
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

  /*
   * La serie del período trae `revenue/cogs/opex/other` por día. Se deriva `margin` acá
   * —ingreso menos costo directo— con la MISMA definición que usa el resto del producto
   * (`utilidadBruta` de `lib/metrics/period-totals.ts`), en vez de recomponerla a mano:
   * el bug que originó CU-868kh8y58 fue exactamente que dos pantallas restaban cosas
   * distintas y las dos parecían correctas.
   */
  const puntos = data.series.map((p) => ({
    period: p.date,
    revenue: p.revenue,
    cogs: p.cogs,
    margin: utilidadBruta(p),
  }));

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
        data={puntos}
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
          {puntos.map((m) => (
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
