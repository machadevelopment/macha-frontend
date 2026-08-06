'use client';

import { useCallback, useEffect, useState } from 'react';
import { AreaChart, BarChart } from '@tremor/react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { PeriodFilter } from '@/components/dashboard/period-filter';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { request, type RequestError } from '@/lib/api/browser';
import { computeRange, type DateRange, type PeriodKey } from '@/lib/period';
import { formatMoney, formatMoneyCompact, formatNumber, formatPct } from '@/lib/format';
import { makeChartTooltip } from '@/components/charts/chart-tooltip';
import { chartAxisStyle, chartColors } from '@/components/charts/chart-theme';
import type {
  CategoryBreakdownResponse,
  PeriodMetricsResponse,
  ProductRevenueResponse,
} from '@/lib/api/dashboard';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * Analítica: las cuatro vistas del prototipo MVP Macha sobre un mismo período.
 *
 * TODO CUELGA DE UN SOLO RANGO, y por eso el estado del período vive aquí y no en cada
 * tarjeta. Si cada una pidiera el suyo, la tendencia podría estar mostrando el año
 * mientras el desglose de costos muestra el mes, sin nada en pantalla que lo delate — el
 * usuario compararía dos números que no son comparables y no tendría cómo saberlo.
 *
 * Las tres peticiones salen en paralelo con el MISMO rango. Si una falla, la pantalla no
 * se cae entera: se marca esa tarjeta y las demás siguen sirviendo. Lo único que sí es
 * bloqueante es `/metrics/period`, porque de ahí salen la tendencia y el flujo de caja, o
 * sea la mitad de la pantalla.
 *
 * Es un solo componente cliente y no cuatro con su propio fetch: son cuatro lecturas del
 * mismo período, y repartirlas en cuatro componentes autónomos multiplicaría por cuatro
 * las peticiones cada vez que alguien toca el filtro.
 */
export function AnalyticsClient({
  locale,
  labels,
  periodLabels,
  common,
}: {
  locale: Locale;
  labels: Dictionary['analytics'];
  periodLabels: Dictionary['dashboard']['period'];
  common: Dictionary['common'];
}) {
  const [periodo, setPeriodo] = useState<PeriodKey>('month');
  const [rango, setRango] = useState<DateRange>(() => computeRange('month', new Date()));
  const [metricas, setMetricas] = useState<PeriodMetricsResponse | null>(null);
  const [categorias, setCategorias] = useState<CategoryBreakdownResponse | null>(null);
  const [productos, setProductos] = useState<ProductRevenueResponse | null>(null);
  const [error, setError] = useState<RequestError | null>(null);

  const cargar = useCallback(async (r: DateRange) => {
    setError(null);
    const [m, c, p] = await Promise.all([
      request<PeriodMetricsResponse>(`/api/metrics-period?from=${r.from}&to=${r.to}`),
      request<CategoryBreakdownResponse>(`/api/metrics-categories?from=${r.from}&to=${r.to}`),
      request<ProductRevenueResponse>(`/api/metrics-products?from=${r.from}&to=${r.to}&limit=8`),
    ]);
    if (!m.ok) {
      setError(m.error);
      return;
    }
    setMetricas(m.data);
    // Secundarias: si fallan, su tarjeta queda vacía pero la pantalla sirve.
    setCategorias(c.ok ? c.data : null);
    setProductos(p.ok ? p.data : null);
  }, []);

  useEffect(() => {
    void cargar(rango);
  }, [cargar, rango]);

  const moneda = (metricas?.baseCurrency ?? 'GTQ') as 'GTQ' | 'USD';
  const tooltip = makeChartTooltip(moneda, locale);
  const fmtEje = (n: number) => formatMoneyCompact(n, moneda, locale);

  const filtro = (
    <PeriodFilter
      value={periodo}
      range={rango}
      onChange={(key, r) => {
        setPeriodo(key);
        setRango(r);
      }}
      locale={locale}
      labels={periodLabels}
    />
  );

  if (error) {
    return (
      <>
        <div className="mb-4">{filtro}</div>
        <Card>
          <LoadError error={error} labels={common.loadError} onRetry={() => void cargar(rango)} />
        </Card>
      </>
    );
  }

  const serie = metricas?.series ?? [];

  // La fecha corta se calcula una vez por punto y no dentro del render del chart: Tremor
  // llama al formateador del eje en cada repintado.
  const fmtDia = new Intl.DateTimeFormat(locale === 'es' ? 'es-GT' : 'en-US', {
    day: '2-digit',
    month: 'short',
  });
  const puntos = serie.map((p) => {
    const etiqueta = fmtDia.format(new Date(`${p.date}T00:00:00`));
    return {
      fecha: etiqueta,
      [labels.revenueTrend]: p.revenue,
      // Entradas vs salidas: la salida agrupa costo directo + gasto operativo, que es
      // como sale el dinero de la cuenta. Separarlos aquí respondería otra pregunta —
      // esa la contesta el desglose por categoría de más abajo.
      [labels.inflow]: p.revenue,
      [labels.outflow]: p.cogs + p.opex,
    };
  });

  const hayDatos = serie.some((p) => p.revenue || p.cogs || p.opex || p.other);

  // Solo costos: el desglose contesta "en qué se va el dinero". Incluir las categorías de
  // ingreso mezclaría dos preguntas en una tabla y el porcentaje dejaría de leerse.
  const filasCosto = (categorias?.rows ?? []).filter((r) => r.type === 'cogs' || r.type === 'opex');

  const barrasProducto = (productos?.items ?? []).map((p) => ({
    name: p.name,
    [labels.revenueByProduct]: p.revenue,
  }));

  return (
    <>
      <div className="mb-4">{filtro}</div>

      {!hayDatos && metricas ? (
        <Card>
          <p className="text-body text-muted-foreground">{labels.empty}</p>
          <p className="mt-1 text-body text-faint">{labels.emptyHint}</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 app:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{labels.revenueTrend}</CardTitle>
              </CardHeader>
              <AreaChart
                className="mt-3 h-64"
                data={puntos}
                index="fecha"
                categories={[labels.revenueTrend]}
                colors={[chartColors.neutral]}
                valueFormatter={fmtEje}
                customTooltip={tooltip}
                showLegend={false}
                yAxisWidth={64}
                {...chartAxisStyle}
              />
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{labels.cashFlow}</CardTitle>
              </CardHeader>
              <BarChart
                className="mt-3 h-64"
                data={puntos}
                index="fecha"
                categories={[labels.inflow, labels.outflow]}
                colors={[chartColors.positive, chartColors.negative]}
                valueFormatter={fmtEje}
                customTooltip={tooltip}
                yAxisWidth={64}
                {...chartAxisStyle}
              />
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 app:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{labels.costByCategory}</CardTitle>
              </CardHeader>
              {filasCosto.length === 0 ? (
                <p className="mt-3 text-body text-muted-foreground">{labels.empty}</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{labels.colCategory}</TableHead>
                        <TableHead>{labels.colType}</TableHead>
                        <TableHead className="text-right">{labels.colTotal}</TableHead>
                        <TableHead className="text-right">{labels.colShare}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filasCosto.map((r) => (
                        <TableRow key={`${r.type}-${r.category}`}>
                          <TableCell className="font-medium">{r.category}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {labels.type[r.type]}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatMoney(r.total, moneda, locale)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                            {/* `sharePct` viene 0-100 y `formatPct` espera fracción. */}
                            {formatPct(r.sharePct / 100, locale)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{labels.revenueByProduct}</CardTitle>
              </CardHeader>
              {barrasProducto.length === 0 ? (
                <p className="mt-3 text-body text-muted-foreground">{labels.empty}</p>
              ) : (
                <BarChart
                  className="mt-3 h-64"
                  data={barrasProducto}
                  index="name"
                  categories={[labels.revenueByProduct]}
                  colors={[chartColors.neutral]}
                  valueFormatter={fmtEje}
                  customTooltip={tooltip}
                  showLegend={false}
                  layout="vertical"
                  yAxisWidth={120}
                  {...chartAxisStyle}
                />
              )}
            </Card>
          </div>

          {/* Tabla accesible equivalente a la serie: un lector de pantalla no puede leer
              un SVG de Recharts, y estos son los números del período. */}
          <table className="sr-only">
            <caption>{labels.revenueTrend}</caption>
            <thead>
              <tr>
                <th scope="col">{labels.colCategory}</th>
                <th scope="col">{labels.inflow}</th>
                <th scope="col">{labels.outflow}</th>
              </tr>
            </thead>
            <tbody>
              {serie.map((p) => (
                <tr key={p.date}>
                  <th scope="row">{p.date}</th>
                  <td>{formatNumber(p.revenue, locale)}</td>
                  <td>{formatNumber(p.cogs + p.opex, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
