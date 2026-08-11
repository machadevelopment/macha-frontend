'use client';

import { useCallback, useEffect, useState } from 'react';
import { DonutChart } from '@tremor/react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Crown,
  Download,
  Layers,
  Minus,
  Package,
  Receipt,
  Snowflake,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { chartColors } from '@/components/charts/chart-theme';
import { cn } from '@/lib/cn';
import { csvFileName, serializeCsv } from '@/lib/csv/serialize';
import { descargarCsv } from '@/lib/csv/download';
import { filasCsvProductos } from '@/components/product-sales/csv';
import { agruparPorCategoria, resumir } from '@/components/product-sales/summary';
import type { ProductRevenue, ProductRevenueResponse } from '@/lib/api/dashboard';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * Ventas por producto — la pantalla del prototipo MVP Macha, sobre datos reales.
 *
 * LA DECISIÓN QUE GOBIERNA ESTA PANTALLA: las unidades pueden no existir. El backend
 * devuelve `units: null` cuando ninguna fila de venta del producto traía cantidad, que es
 * el caso normal en la contabilidad de una PYME —el libro tiene montos y fechas, no
 * siempre una columna de cantidades—. Mostrar "0 unidades" ahí sería falso sobre un
 * producto que facturó miles, y un ticket promedio calculado sobre ese 0 sería peor: un
 * número con aspecto de dato.
 *
 * Así que donde no se sabe, se dice que no se sabe, y se explica por qué. La alternativa
 * cómoda (tratar null como 0) da una pantalla llena y mentirosa; esta da una pantalla con
 * huecos honestos que el dueño puede cerrar agregando una columna a su Excel.
 */
export function ProductSalesClient({
  locale,
  labels,
  periodLabels,
  common,
}: {
  locale: Locale;
  labels: Dictionary['productSales'];
  periodLabels: Dictionary['dashboard']['period'];
  common: Dictionary['common'];
}) {
  const [periodo, setPeriodo] = useState<PeriodKey>('month');
  const [rango, setRango] = useState<DateRange>(() => computeRange('month', new Date()));
  const [data, setData] = useState<ProductRevenueResponse | null>(null);
  const [error, setError] = useState<RequestError | null>(null);

  const cargar = useCallback(async (r: DateRange) => {
    setError(null);
    // `limit=200` es el techo del backend: esta pantalla lista el catálogo, no un top 5.
    const res = await request<ProductRevenueResponse>(
      `/api/metrics-products?from=${r.from}&to=${r.to}&limit=200`,
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setData(res.data);
  }, []);

  useEffect(() => {
    void cargar(rango);
  }, [cargar, rango]);

  const moneda = (data?.baseCurrency ?? 'GTQ') as 'GTQ' | 'USD';
  const items = data?.items ?? [];

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

  /**
   * EXPORTAR, no importar. La tabla ya está entera en memoria —`/api/metrics-products`
   * con `limit=200`, el catálogo completo y no un top-N—, así que el archivo se arma
   * aquí: pedirle al backend que lo vuelva a calcular sería una segunda consulta al
   * mismo dato y abriría la puerta a que el archivo y la pantalla no coincidan.
   *
   * Sale con el período y la moneda base que están seleccionados en este momento, que es
   * lo que el usuario está viendo cuando presiona el botón.
   */
  const exportar = () => {
    const contenido = serializeCsv(filasCsvProductos({ items, labels, moneda, locale }));
    descargarCsv(csvFileName(labels.csvFileName, rango), contenido);
  };

  // El botón solo aparece cuando hay algo que exportar: en el estado vacío o de error
  // descargaría un archivo con puros encabezados, que se ve como una falla del producto.
  const encabezado = (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      {filtro}
      {items.length > 0 && (
        <Button variant="outline" size="sm" onClick={exportar} className="gap-2">
          <Download className="h-3.5 w-3.5" strokeWidth={1.7} />
          {labels.exportCsv}
        </Button>
      )}
    </div>
  );

  if (error) {
    return (
      <>
        {encabezado}
        <Card>
          <LoadError error={error} labels={common.loadError} onRetry={() => void cargar(rango)} />
        </Card>
      </>
    );
  }

  if (data && items.length === 0) {
    return (
      <>
        {encabezado}
        <Card>
          <p className="text-body text-muted-foreground">{labels.empty}</p>
          <p className="mt-1 text-body text-faint">{labels.emptyHint}</p>
        </Card>
      </>
    );
  }

  const resumen = resumir(items);
  const porCategoria = agruparPorCategoria(items, labels.uncategorized);

  const tarjetas: Array<{ label: string; value: string; sub: string; icon: React.ReactNode }> = [
    {
      label: labels.topProduct,
      value: resumen.top?.name ?? '—',
      sub: resumen.top ? formatMoney(resumen.top.revenue, moneda, locale) : '',
      icon: <Crown className="h-3.5 w-3.5" strokeWidth={1.7} />,
    },
    {
      label: labels.unitsSold,
      // `null` (nadie reportó unidades) se distingue de 0 unidades reales.
      value: resumen.unidades === null ? labels.noUnits : formatNumber(resumen.unidades, locale),
      sub: resumen.unidades === null ? labels.noUnitsHint : labels.allProducts,
      icon: <Package className="h-3.5 w-3.5" strokeWidth={1.7} />,
    },
    {
      label: labels.avgTicket,
      value:
        resumen.ticketPromedio === null
          ? labels.noUnits
          : formatMoney(resumen.ticketPromedio, moneda, locale),
      sub: resumen.ticketPromedio === null ? labels.noUnitsHint : labels.revenuePerUnit,
      icon: <Receipt className="h-3.5 w-3.5" strokeWidth={1.7} />,
    },
    {
      label: labels.bestCategory,
      value: porCategoria[0]?.name ?? '—',
      sub: porCategoria[0] ? formatMoney(porCategoria[0].revenue, moneda, locale) : '',
      icon: <Layers className="h-3.5 w-3.5" strokeWidth={1.7} />,
    },
    {
      label: labels.slowMover,
      value: resumen.lento?.name ?? '—',
      sub: resumen.lento ? formatMoney(resumen.lento.revenue, moneda, locale) : '',
      icon: <Snowflake className="h-3.5 w-3.5" strokeWidth={1.7} />,
    },
  ];

  return (
    <>
      {encabezado}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 app:grid-cols-3 xl:grid-cols-5">
        {tarjetas.map((c) => (
          <Card key={c.label}>
            <p className="flex items-center justify-between gap-2 font-mono text-eyebrow uppercase text-faint">
              {c.label}
              {c.icon}
            </p>
            <p className="mt-2 truncate text-cardh2" title={c.value}>
              {c.value}
            </p>
            {c.sub && <p className="mt-1 text-body text-muted-foreground">{c.sub}</p>}
          </Card>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 app:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{labels.performance}</CardTitle>
          </CardHeader>
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{labels.colProduct}</TableHead>
                  <TableHead>{labels.colCategory}</TableHead>
                  <TableHead className="text-right">{labels.colUnits}</TableHead>
                  <TableHead className="text-right">{labels.colRevenue}</TableHead>
                  <TableHead className="text-right">{labels.colCogs}</TableHead>
                  <TableHead className="text-right">{labels.colMargin}</TableHead>
                  <TableHead className="text-right">{labels.colShare}</TableHead>
                  <TableHead className="text-center">{labels.colTrend}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.productId}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.category ?? labels.uncategorized}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-mono tabular-nums',
                        p.units === null && 'text-faint',
                      )}
                      title={p.units === null ? labels.noUnitsHint : undefined}
                    >
                      {p.units === null ? labels.noUnits : formatNumber(p.units, locale)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatMoney(p.revenue, moneda, locale)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {formatMoney(p.cogs, moneda, locale)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {/* `null` = producto sin ventas en el rango; no existe margen, no es 0%. */}
                      {p.grossMarginPct === null ? '—' : formatPct(p.grossMarginPct / 100, locale)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {formatPct(p.revenueSharePct / 100, locale)}
                    </TableCell>
                    <TableCell>
                      <span
                        className="flex items-center justify-center"
                        title={labels.trend[p.trend]}
                      >
                        <IconoTendencia trend={p.trend} />
                        <span className="sr-only">{labels.trend[p.trend]}</span>
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{labels.salesByCategory}</CardTitle>
          </CardHeader>
          {porCategoria.length === 0 ? (
            <p className="mt-3 text-body text-muted-foreground">{labels.empty}</p>
          ) : (
            <>
              <DonutChart
                className="mt-3 h-56"
                data={porCategoria}
                index="name"
                category="revenue"
                valueFormatter={(n) => formatMoneyCompact(n, moneda, locale)}
                customTooltip={makeChartTooltip(moneda, locale)}
                colors={[chartColors.neutral]}
              />
              <ul className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
                {porCategoria.map((c) => (
                  <li key={c.name} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-body">{c.name}</span>
                    <span className="shrink-0 font-mono text-body tabular-nums text-muted-foreground">
                      {formatPct(c.sharePct, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </>
  );
}

function IconoTendencia({ trend }: { trend: ProductRevenue['trend'] }) {
  if (trend === 'up')
    return <ArrowUpRight className="h-3.5 w-3.5 text-success" strokeWidth={1.7} />;
  if (trend === 'down') {
    return <ArrowDownRight className="h-3.5 w-3.5 text-danger" strokeWidth={1.7} />;
  }
  return <Minus className="h-3.5 w-3.5 text-faint" strokeWidth={1.7} />;
}
