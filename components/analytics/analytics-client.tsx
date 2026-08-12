'use client';

import { useCallback, useEffect, useState } from 'react';
import { AreaChart } from '@tremor/react';
import { DollarSign, Percent, PiggyBank, Receipt } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { PeriodFilter } from '@/components/dashboard/period-filter';
import { KpiCard } from '@/components/charts/kpi-card';
import { DeltaBadge } from '@/components/charts/delta-badge';
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
import { delta, gastos, margenBruto, utilidadBruta } from '@/lib/metrics/period-totals';
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
 * Analítica: las vistas del prototipo MVP Macha sobre un mismo período.
 *
 * TODO CUELGA DE UN SOLO RANGO, y por eso el estado del período vive aquí y no en cada
 * tarjeta. Si cada una pidiera el suyo, la tendencia podría estar mostrando el año
 * mientras el desglose de costos muestra el mes, sin nada en pantalla que lo delate — el
 * usuario compararía dos números que no son comparables y no tendría cómo saberlo.
 *
 * Las tres peticiones salen en paralelo con el MISMO rango. Si una falla, la pantalla no
 * se cae entera: se marca esa tarjeta y las demás siguen sirviendo. Lo único que sí es
 * bloqueante es `/metrics/period`, porque de ahí salen los KPIs, la tendencia y el flujo
 * de caja, o sea casi toda la pantalla.
 *
 * Es un solo componente cliente y no cuatro con su propio fetch: son cuatro lecturas del
 * mismo período, y repartirlas en cuatro componentes autónomos multiplicaría por cuatro
 * las peticiones cada vez que alguien toca el filtro.
 *
 * ── ACABADO PREMIUM (CU-868knx15v) ──
 * Zona "producto" del design guide §2.7: el color de los datos es el FUNCIONAL
 * (`success`/`danger`), y el salvia de marca NO aparece en esta pantalla ni una vez. Las
 * cifras van en la tipografía de interfaz con `tabular-nums`, no en monoespaciada — la
 * regla mono revisada (§3) la reserva para eyebrows y labels en mayúscula.
 */
export function AnalyticsClient({
  locale,
  labels,
  kpiLabels,
  periodLabels,
  common,
}: {
  locale: Locale;
  labels: Dictionary['analytics'];
  /**
   * Se reutilizan los textos de KPI del dashboard en vez de duplicarlos bajo `analytics`:
   * son literalmente las mismas cuatro métricas del mismo endpoint, y dos juegos de
   * etiquetas para lo mismo terminan diciendo "Gastos" en una pantalla y "Egresos" en la
   * otra. El precedente ya existía con `periodLabels`.
   */
  kpiLabels: Dictionary['dashboard']['kpi'];
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

  /** Cuatro tarjetas y no cinco: sin el rail de 348px del dashboard, 4 caen en una fila
   *  limpia (2 bajo `app`) y cada una conserva ancho de sobra para su cifra exacta. */
  const GRID_KPI = 'grid grid-cols-1 gap-3 sm:grid-cols-2 app:grid-cols-4';

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

  // Estado de carga explícito: antes la pantalla pintaba charts vacíos mientras llegaba la
  // respuesta, que se ve igual que "no tienes datos". Son cosas distintas y el usuario no
  // tenía cómo distinguirlas.
  if (!metricas) {
    return (
      <div className="flex flex-col gap-4">
        {filtro}
        <div className={GRID_KPI}>
          {[0, 1, 2, 3].map((i) => (
            <KpiCard key={i} label="" value="" loading />
          ))}
        </div>
        <Card>
          <div className="h-80" aria-busy="true" />
        </Card>
      </div>
    );
  }

  const serie = metricas.series;

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

  const itemsProducto = productos?.items ?? [];
  const margen = margenBruto(metricas.current);
  const deltaIngreso = delta(metricas.current.revenue, metricas.previous.revenue);

  if (!hayDatos) {
    return (
      <>
        <div className="mb-4">{filtro}</div>
        <Card>
          <p className="text-body text-muted-foreground">{labels.empty}</p>
          <p className="mt-1 text-body text-faint">{labels.emptyHint}</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="mb-4">{filtro}</div>

      <div className="flex flex-col gap-4">
        {/*
          1 — FILA DE KPIs con variación contra el período anterior.
          No se calcula nada nuevo: `previous` es la ventana del MISMO tamaño justo antes,
          que el backend ya devuelve en la misma respuesta que alimenta las gráficas. Y no
          llevan sparkline aunque `KpiCard` lo soporte: la forma de la serie es exactamente
          lo que muestra la tendencia de abajo a tamaño completo, y repetirla cuatro veces
          en miniatura le come protagonismo a la pieza que debe dominar.
        */}
        <div className={GRID_KPI}>
          <KpiCard
            label={kpiLabels.revenue}
            icon={<DollarSign className="h-4 w-4" strokeWidth={1.7} />}
            value={formatMoneyCompact(metricas.current.revenue, moneda, locale)}
            exact={formatMoney(metricas.current.revenue, moneda, locale)}
            delta={deltaIngreso}
            deltaCaption={kpiLabels.vsPrevious}
            locale={locale}
          />
          <KpiCard
            label={kpiLabels.expenses}
            icon={<Receipt className="h-4 w-4" strokeWidth={1.7} />}
            value={formatMoneyCompact(gastos(metricas.current), moneda, locale)}
            exact={formatMoney(gastos(metricas.current), moneda, locale)}
            delta={delta(gastos(metricas.current), gastos(metricas.previous))}
            deltaCaption={kpiLabels.vsPrevious}
            // Un gasto que sube NO es una buena noticia: el chip va rojo aunque la flecha
            // apunte hacia arriba.
            invertDelta
            locale={locale}
          />
          <KpiCard
            label={kpiLabels.grossProfit}
            icon={<PiggyBank className="h-4 w-4" strokeWidth={1.7} />}
            value={formatMoneyCompact(utilidadBruta(metricas.current), moneda, locale)}
            exact={formatMoney(utilidadBruta(metricas.current), moneda, locale)}
            delta={delta(utilidadBruta(metricas.current), utilidadBruta(metricas.previous))}
            deltaCaption={kpiLabels.vsPrevious}
            locale={locale}
          />
          <KpiCard
            label={kpiLabels.margin}
            icon={<Percent className="h-4 w-4" strokeWidth={1.7} />}
            // Sin delta a propósito: la variación de un porcentaje ya es un porcentaje, y
            // "+12% sobre un 35%" no dice si el margen subió 12 puntos o a 39.2%.
            value={margen === null ? '—' : formatPct(margen, locale)}
            hint={kpiLabels.marginHint}
            locale={locale}
          />
        </div>

        {/*
          2 y 5 — LA TENDENCIA DOMINA: ancho completo, cifra grande y delta SOBRE la
          gráfica. Antes era media fila compartida con el flujo de caja, y una gráfica sola
          obliga a leer el eje Y para saber de cuánto dinero se está hablando. El total del
          período arriba contesta eso de un vistazo y la curva pasa a explicar la FORMA, que
          es lo único que una gráfica hace mejor que un número.
        */}
        <Card>
          <CardHeader>
            <CardTitle>{labels.revenueTrend}</CardTitle>
          </CardHeader>
          <p className="font-mono text-eyebrow uppercase text-faint">{labels.periodTotal}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {/* Monto COMPLETO, no abreviado: acá sobra ancho y es la cifra ancla de la
                pantalla. `formatMoneyCompact` es para donde no cabe (ejes, tarjetas). */}
            <p className="text-statbig tabular-nums">
              {formatMoney(metricas.current.revenue, moneda, locale)}
            </p>
            {deltaIngreso !== undefined && (
              <span className="flex items-center gap-2">
                <DeltaBadge value={deltaIngreso} locale={locale} />
                <span className="text-body text-faint">{kpiLabels.vsPrevious}</span>
              </span>
            )}
          </div>
          {/*
            4 — ÁREA CON DEGRADADO. `showGradient` va explícito aunque sea el default de
            Tremor: es una decisión de diseño de esta pantalla, no un accidente de la
            librería, y quien lea el archivo tiene que poder verla. `curveType="monotone"`
            suaviza la curva sin inventar picos entre puntos (a diferencia de "natural",
            que sobrepasa los valores reales — inaceptable en un dato financiero).
            La serie va NEUTRA: un ingreso no es "bueno" ni "malo" por existir, y el verde
            funcional está reservado para lo que sí señala estado, como el chip de arriba.
          */}
          <AreaChart
            className="mt-4 h-80"
            data={puntos}
            index="fecha"
            categories={[labels.revenueTrend]}
            colors={[chartColors.neutral]}
            valueFormatter={fmtEje}
            customTooltip={tooltip}
            showLegend={false}
            showGradient
            curveType="monotone"
            yAxisWidth={64}
            {...chartAxisStyle}
          />
        </Card>

        {/* `g-side` del design guide §4.4 (1.35fr / 1fr): la gráfica necesita ancho para
            que la curva se lea; la lista de productos es texto y se defiende en menos. */}
        <div className="grid grid-cols-1 gap-4 app:grid-cols-[1.35fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>{labels.cashFlow}</CardTitle>
            </CardHeader>
            {/*
              4 — de barras agrupadas a DOS ÁREAS con degradado. Las barras dobles obligan a
              comparar alturas par por par para ver si la caja del día fue positiva; con las
              áreas superpuestas, el hueco entre las dos curvas ES el resultado y se lee sin
              contar nada. Verde/rojo funcionales, que acá sí señalan estado: entra plata /
              sale plata.
            */}
            <AreaChart
              className="mt-3 h-64"
              data={puntos}
              index="fecha"
              categories={[labels.inflow, labels.outflow]}
              colors={[chartColors.positive, chartColors.negative]}
              valueFormatter={fmtEje}
              customTooltip={tooltip}
              showGradient
              curveType="monotone"
              yAxisWidth={64}
              {...chartAxisStyle}
            />
          </Card>

          {/*
            3 — INGRESO POR PRODUCTO como lista con barras de participación, no como gráfico
            de barras vertical. El chart de Tremor recortaba los nombres largos en el eje Y y
            no mostraba el monto de cada producto en ningún lado sin pasar el cursor. La lista
            da nombre completo, monto exacto y participación a la vez, y la barra es lo único
            que aporta la gráfica: el tamaño relativo.
          */}
          <Card>
            <CardHeader>
              <CardTitle>{labels.revenueByProduct}</CardTitle>
            </CardHeader>
            {itemsProducto.length === 0 ? (
              <p className="mt-3 text-body text-muted-foreground">{labels.empty}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {itemsProducto.map((p) => (
                  <li key={p.productId}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-body" title={p.name}>
                        {p.name}
                      </span>
                      <span className="shrink-0 text-body tabular-nums">
                        {formatMoney(p.revenue, moneda, locale)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      {/*
                        Barra de participación en tinta neutra, no verde: la cuota de un
                        producto no dice "va bien o mal", solo cuánto pesa. El color
                        funcional acá sería ruido (design guide §2.6).

                        `aria-hidden` porque el porcentaje va en texto justo al lado — un
                        lector de pantalla que también anunciara la barra leería el mismo
                        dato dos veces.
                      */}
                      <div
                        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-[5px] bg-muted"
                        aria-hidden="true"
                      >
                        <div
                          className="h-full rounded-[5px] bg-foreground"
                          // `revenueSharePct` viene 0-100 y aquí se necesita el ancho en %.
                          // Es el único estilo inline de la pantalla: es un valor calculado
                          // por fila, no una clase que Tailwind pueda generar.
                          style={{ width: `${Math.min(100, Math.max(0, p.revenueSharePct))}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-body tabular-nums text-muted-foreground">
                        {formatPct(p.revenueSharePct / 100, locale)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* La tabla de costos pasa a ancho completo: es la pieza con más columnas de la
            pantalla y a media fila era la que peor se leía. */}
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
                      <TableCell className="text-muted-foreground">{labels.type[r.type]}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(r.total, moneda, locale)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
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

        {/* Lo mismo para la lista de productos: la barra es `aria-hidden`, así que esta
            tabla es lo que le da el dato completo a un lector de pantalla. */}
        {itemsProducto.length > 0 && (
          <table className="sr-only">
            <caption>{labels.revenueByProduct}</caption>
            <thead>
              <tr>
                <th scope="col">{labels.colCategory}</th>
                <th scope="col">{labels.colTotal}</th>
                <th scope="col">{labels.shareOfRevenue}</th>
              </tr>
            </thead>
            <tbody>
              {itemsProducto.map((p) => (
                <tr key={p.productId}>
                  <th scope="row">{p.name}</th>
                  <td>{formatMoney(p.revenue, moneda, locale)}</td>
                  <td>{formatPct(p.revenueSharePct / 100, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
