'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  BarChart,
  DonutChart,
  type AreaChartProps,
  type BarChartProps,
  type DonutChartProps,
} from '@tremor/react';
import { cn } from '@/lib/cn';
import { CHART_SURFACE } from './chart-theme';
import { makeChartTooltip } from './chart-tooltip';
import { formatMoneyCompact } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';

/**
 * LA ÚNICA PUERTA A `@tremor/react` (CU-868knx0vh). Lo defiende `chart-surface.test.ts`.
 *
 * Antes cada pantalla montaba su chart de Tremor a mano, y el resultado fue tres estilos
 * distintos para la misma pieza: la tendencia del dashboard salía sin `curveType` y con
 * `font-mono` en los ejes, la de Analítica con degradado y curva suave, y la de CxC/CxP
 * con otra combinación más. No era descuido de nadie — con siete props de estilo repetidas
 * en cada llamada, que las tres coincidan es cuestión de suerte, y quien tocaba una no
 * tenía forma de saber que las otras dos existían.
 *
 * Acá se decide UNA VEZ:
 *   · **Área con degradado y curva suave.** `showGradient` va explícito aunque sea el
 *     default de Tremor: es decisión de diseño del rediseño Brand Book ("áreas con
 *     degradado suave bajo la curva, no líneas secas"), y tiene que poder leerse como tal.
 *     `curveType="monotone"` suaviza SIN inventar picos entre puntos — a diferencia de
 *     "natural", que sobrepasa los valores reales, inaceptable en un dato financiero.
 *   · **Eje compacto, tooltip exacto.** `valueFormatter` de Tremor alimenta el eje Y Y el
 *     tooltip a la vez (CU-868khvyqa). El eje necesita `GTQ 145 k` para no recortarse; el
 *     tooltip es donde el usuario lee la cifra y ahí va completa. Derivar los dos de
 *     `currency` + `locale` es lo que impide que vuelvan a separarse en una pantalla sola.
 *   · **`CHART_SURFACE`**, que es lo que engancha el CSS de ejes/grid/leyenda de
 *     `globals.css`. Ver `chart-theme.ts` para por qué el estilo del SVG tiene que ir por
 *     CSS y no por props.
 *
 * Lo que NO se decide acá es el COLOR de las series: lo elige cada pantalla con
 * `chartColors`, porque el color señala estado del dato y eso depende de qué mide la serie.
 */

/** Toda cifra de estos charts es dinero, y el formato es locale-aware (`lib/format`). */
type ConMoneda<P> = P & { currency: 'GTQ' | 'USD'; locale: Locale };

function useFormatoMoneda(currency: 'GTQ' | 'USD', locale: Locale) {
  // `makeChartTooltip` devuelve un componente NUEVO en cada llamada. Sin memo, cada
  // repintado le cambia la identidad del tipo a Recharts y el tooltip se desmonta y vuelve
  // a montar en vez de actualizarse.
  return useMemo(
    () => ({
      valueFormatter: (v: number) => formatMoneyCompact(v, currency, locale),
      customTooltip: makeChartTooltip(currency, locale),
    }),
    [currency, locale],
  );
}

/** Serie temporal: área con degradado bajo la curva. */
export function TrendArea({
  currency,
  locale,
  className,
  valueFormatter,
  customTooltip,
  ...props
}: ConMoneda<AreaChartProps>) {
  const moneda = useFormatoMoneda(currency, locale);
  return (
    <AreaChart
      showGradient
      curveType="monotone"
      valueFormatter={valueFormatter ?? moneda.valueFormatter}
      customTooltip={customTooltip ?? moneda.customTooltip}
      {...props}
      className={cn(CHART_SURFACE, className)}
    />
  );
}

/** Comparación por categoría (aging de CxC/CxP): barras, no área — el eje X no es tiempo. */
export function CategoryBars({
  currency,
  locale,
  className,
  valueFormatter,
  customTooltip,
  ...props
}: ConMoneda<BarChartProps>) {
  const moneda = useFormatoMoneda(currency, locale);
  return (
    <BarChart
      valueFormatter={valueFormatter ?? moneda.valueFormatter}
      customTooltip={customTooltip ?? moneda.customTooltip}
      {...props}
      className={cn(CHART_SURFACE, className)}
    />
  );
}

/** Participación sobre un total (ventas por categoría). */
export function ShareDonut({
  currency,
  locale,
  className,
  valueFormatter,
  customTooltip,
  ...props
}: ConMoneda<DonutChartProps>) {
  const moneda = useFormatoMoneda(currency, locale);
  return (
    <DonutChart
      valueFormatter={valueFormatter ?? moneda.valueFormatter}
      customTooltip={customTooltip ?? moneda.customTooltip}
      {...props}
      className={cn(CHART_SURFACE, className)}
    />
  );
}
