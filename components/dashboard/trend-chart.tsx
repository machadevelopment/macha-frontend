'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { request } from '@/lib/api/browser';
import { useResource } from '@/lib/api/use-resource';
import { formatDate, formatDateAxis, formatMoney } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { PeriodMetricsResponse } from '@/lib/api/dashboard';
import { usePeriodScope } from '@/components/dashboard/period-scope';
import { utilidadBruta } from '@/lib/metrics/period-totals';
import { agruparSerieDeTendencia } from '@/lib/metrics/series-grouping';
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
   * arriba y la tendencia de Analítica. Devuelve una SERIE DIARIA del rango exacto.
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
   * ═══ CU-868ktm0re: LA GRANULARIDAD SIGUE AL PERÍODO ═══
   *
   * `agruparSerieDeTendencia` (`lib/metrics/series-grouping.ts`) es lo que faltó en
   * CU-868kt8x90: esa tarjeta ya pedía el rango correcto, pero pintaba la serie DIARIA tal
   * cual llegaba — así que "este año" mostraba sus 365 puntos en vez de 12. La duración de
   * `rango` (no el nombre del preset: un rango personalizado largo tiene que agruparse
   * igual) decide si se agrupa por mes; el umbral y el porqué están documentados ahí.
   */
  const { granularidad, puntos: serieAgrupada } = agruparSerieDeTendencia(
    data.series,
    data.from,
    data.to,
  );
  // Un rango personalizado puede cruzar un año hacia atrás y hacia adelante a la vez (los
  // presets fijos nunca lo hacen); ahí dos "ene" sin año serían ambiguos. Ver `formatDateAxis`.
  const conAnio = data.from.slice(0, 4) !== data.to.slice(0, 4);

  /*
   * La serie ya agrupada trae `revenue/cogs/opex/other` por día O por mes. Se deriva
   * `margin` acá —ingreso menos costo directo— con la MISMA definición que usa el resto
   * del producto (`utilidadBruta` de `lib/metrics/period-totals.ts`), en vez de
   * recomponerla a mano: el bug que originó CU-868kh8y58 fue exactamente que dos pantallas
   * restaban cosas distintas y las dos parecían correctas.
   *
   * `date` se conserva sin formatear (para la key de React y la tabla accesible, donde SÍ
   * cabe la fecha completa) y `period` lleva la etiqueta CORTA que ve el eje del chart —
   * CU-868kt8yy6. Tremor no separa el valor de la categoría de su etiqueta visible: lo que
   * se le pasa a `index` es literalmente lo que dibuja en el eje X, así que el formateo
   * tiene que pasar por acá, no por una prop del chart.
   */
  const puntos = serieAgrupada.map((p) => ({
    date: p.date,
    period: formatDateAxis(p.date, locale, granularidad, { conAnio }),
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
        /*
         * CU-868kt8yy6: "en vista anual, los 12 meses etiquetados sin saltear". Tremor
         * calcula qué marcas caben con `equidistantPreserveStart` (su default) usando el
         * ancho medido de la etiqueta más el `tickGap`; con el `tickGap` de 5px por
         * defecto y hasta doce meses, en tarjetas angostas alcanzaba a saltarse uno de
         * cada dos. `tickGap={0}` en la vista mensual le da a Recharts el margen mínimo
         * para intentar mostrarlas TODAS — sigue siendo el mismo algoritmo el que decide
         * si de verdad caben, así que una pantalla angosta de verdad todavía puede saltar
         * alguna en vez de encimarlas (el otro criterio de aceptación del ticket). En la
         * vista diaria se deja el default: ahí SÍ es esperable que el eje salte marcas
         * (hasta 45 puntos), y forzarlas todas sería el mismo amontonamiento de antes.
         */
        tickGap={granularidad === 'month' ? 0 : undefined}
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
            <tr key={m.date}>
              {/* La tabla accesible sí tiene ancho para la fecha completa (`formatDate`,
                  `dateStyle: 'medium'`); la abreviada de `m.period` es solo para el eje. */}
              <td>{formatDate(m.date, locale)}</td>
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
