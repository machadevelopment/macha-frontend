'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { DeltaBadge } from '@/components/charts/delta-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { chartColors } from '@/components/charts/chart-theme';
import { CHART_HEIGHT, TrendArea } from '@/components/charts/chart-primitives';
import { formatDateAxis, formatMoney, formatNumber, formatPct } from '@/lib/format';
import { agruparSerieDeTendencia } from '@/lib/metrics/series-grouping';
import type {
  CategoryBreakdownResponse,
  CategoryBreakdownRow,
  PeriodMetricsResponse,
  ProductRevenueResponse,
} from '@/lib/api/dashboard';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * Los paneles de Analítica, cada uno independiente del tab que lo monte — CU-868kt29t0.
 *
 * ═══ POR QUÉ SE EXTRAJERON ═══
 *
 * Antes vivían en línea dentro de `analytics-client.tsx`, que era una pantalla sin tabs. Con
 * seis tabs, varios paneles aparecen en más de uno: la tendencia de ingresos está en Resumen
 * y en Ingresos; el flujo está en Resumen y en Flujo de caja. Copiarlos sería garantizar que
 * uno se corrija y el otro no — y el síntoma en un producto financiero es el peor posible:
 * la misma cifra distinta en dos tabs, las dos plausibles y ninguna marcada como sospechosa.
 *
 * Cada panel recibe SOLO lo que pinta. Ninguno hace fetch: el período es uno para toda la
 * pantalla (ver `analytics-client.tsx`) y si cada panel pidiera el suyo, la tendencia podría
 * mostrar el año mientras el desglose muestra el mes, sin nada en pantalla que lo delate.
 *
 * ═══ LO QUE NO CAMBIÓ ═══
 *
 * El acabado y las decisiones de color son los de CU-868knx15v y se conservan tal cual: la
 * serie de ingresos va NEUTRA (un ingreso no es "bueno" por existir), entradas/salidas van
 * en verde/rojo funcionales porque ahí el color sí señala estado, y las barras de
 * participación van en tinta neutra porque una cuota no dice "va bien o mal".
 */

/** Puntos ya con la etiqueta del eje resuelta. Ver `puntosDeSerie`. */
export type PuntoDeSerie = Record<string, string | number>;

/**
 * Prepara la serie para las gráficas.
 *
 * La fecha corta se formatea UNA vez por punto y no dentro del render del chart: Tremor
 * llama al formateador del eje en cada repintado.
 */
export function puntosDeSerie(
  serie: PeriodMetricsResponse['series'],
  locale: Locale,
  labels: Dictionary['analytics'],
  /**
   * El rango que se está mirando — CU-868ktvh75.
   *
   * Sin él no se puede decidir la granularidad, y sin granularidad esta función pintaba la
   * serie DIARIA tal cual la manda el backend: con "este año", 365 puntos en un eje con
   * espacio para una docena. Es el mismo defecto que CU-868ktm0re arregló en el dashboard;
   * Analítica tiene su propio panel y se había quedado con la versión vieja.
   *
   * Opcional para no romper a ningún llamador que todavía no lo pase: sin rango se conserva
   * el comportamiento anterior (día a día), que es correcto para períodos cortos.
   */
  rango?: { from: string; to: string },
): PuntoDeSerie[] {
  /*
   * Se agrupa ANTES de formatear. Al revés —formatear y luego agrupar— habría que volver a
   * parsear la etiqueta ya localizada para saber a qué mes pertenece cada punto, que es
   * exactamente el tipo de ida y vuelta que `lib/format` existe para evitar.
   */
  const { granularidad, puntos } = rango
    ? agruparSerieDeTendencia(serie, rango.from, rango.to)
    : { granularidad: 'day' as const, puntos: serie };

  /*
   * El año se muestra solo si el rango lo cruza. En una vista anual normal es ruido —los
   * doce meses son del mismo año y el eje ya va apretado— pero en un rango personalizado
   * que va de noviembre a febrero, sin él dos etiquetas distintas se leen igual.
   */
  const conAnio = rango ? rango.from.slice(0, 4) !== rango.to.slice(0, 4) : false;

  return puntos.map((p) => ({
    fecha: formatDateAxis(p.date, locale, granularidad, { conAnio }),
    [labels.revenueTrend]: p.revenue,
    // La salida agrupa costo directo + gasto operativo, que es como sale el dinero de la
    // cuenta. Separarlos acá contestaría otra pregunta — esa la contesta el desglose por
    // categoría del tab de Costos.
    [labels.inflow]: p.revenue,
    [labels.outflow]: p.cogs + p.opex,
  }));
}

/**
 * Tendencia de ingresos, con el total del período coronándola.
 *
 * La cifra grande arriba existe porque una gráfica sola obliga a leer el eje Y para saber de
 * cuánto dinero se habla; con el total explícito, la curva pasa a explicar la FORMA, que es
 * lo único que una gráfica hace mejor que un número.
 */
export function PanelTendencia({
  metricas,
  puntos,
  moneda,
  locale,
  labels,
  kpiLabels,
  deltaIngreso,
  alto = CHART_HEIGHT.area,
}: {
  metricas: PeriodMetricsResponse;
  puntos: PuntoDeSerie[];
  moneda: 'GTQ' | 'USD';
  locale: Locale;
  labels: Dictionary['analytics'];
  kpiLabels: Dictionary['dashboard']['kpi'];
  deltaIngreso: number | undefined;
  alto?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.revenueTrend}</CardTitle>
      </CardHeader>
      <p className="font-mono text-eyebrow uppercase text-faint">{labels.periodTotal}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {/* Monto COMPLETO, no abreviado: acá sobra ancho y es la cifra ancla de la pantalla. */}
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
        ═══ ESTA GRÁFICA VA SIN EJE Y, Y NO ES UN RECORTE ═══

        El prototipo la dibuja con `<YAxis hide>` (`Analytics.tsx`), y acá el argumento ya
        estaba escrito cuatro párrafos arriba: la cifra del período corona la gráfica, así que
        la curva solo tiene que explicar la FORMA. El eje repetía en cinco etiquetas
        —`USD 30K`, `USD 22.5K`, …— una magnitud que el título ya da exacta y completa.

        Lo que se gana es medible: cinco textos menos de cromo y los 64px de ancho que
        `yAxisWidth` reservaba, que en el Resumen (donde comparte fila con los productos) es
        justo el ancho que le faltaba a la curva para no verse alta y apretada.

        Y no deja a nadie sin los números: las tablas accesibles equivalentes de esta misma
        pantalla traen la serie completa, que es lo que un lector de pantalla lee de todos
        modos —un SVG de Recharts no se puede leer.

        `PanelFlujo` SÍ conserva su eje: en el Resumen no lleva cifra coronándola, así que ahí
        el eje es la única referencia de magnitud que hay.
      */}
      <TrendArea
        className={`mt-4 ${alto}`}
        data={puntos}
        index="fecha"
        categories={[labels.revenueTrend]}
        colors={[chartColors.neutral]}
        currency={moneda}
        locale={locale}
        showLegend={false}
        showYAxis={false}
      />
    </Card>
  );
}

/**
 * Entradas contra salidas.
 *
 * Dos áreas superpuestas y no barras agrupadas: con barras hay que comparar alturas par por
 * par para ver si la caja del día fue positiva; con las áreas, el hueco entre las curvas ES
 * el resultado y se lee sin contar nada.
 */
export function PanelFlujo({
  puntos,
  moneda,
  locale,
  labels,
  alto = CHART_HEIGHT.areaWide,
  resumen,
}: {
  puntos: PuntoDeSerie[];
  moneda: 'GTQ' | 'USD';
  locale: Locale;
  labels: Dictionary['analytics'];
  alto?: string;
  /** Neto del período, cuando el tab quiere coronarlo. El Resumen no lo muestra. */
  resumen?: { neto: number };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.cashFlow}</CardTitle>
      </CardHeader>
      {resumen && (
        <>
          <p className="font-mono text-eyebrow uppercase text-faint">{labels.net}</p>
          {/* El neto SÍ lleva color funcional: acá el signo es exactamente la noticia —
              entró más de lo que salió, o al revés. */}
          <p
            className={`mt-1 text-statbig tabular-nums ${
              resumen.neto < 0 ? 'text-danger' : 'text-success'
            }`}
          >
            {formatMoney(resumen.neto, moneda, locale)}
          </p>
        </>
      )}
      <TrendArea
        className={`mt-3 ${alto}`}
        data={puntos}
        index="fecha"
        categories={[labels.inflow, labels.outflow]}
        colors={[chartColors.positive, chartColors.negative]}
        currency={moneda}
        locale={locale}
        yAxisWidth={64}
      />
    </Card>
  );
}

/**
 * Ingreso por producto, como lista con barras de participación y no como gráfico de barras.
 *
 * El chart de Tremor recortaba los nombres largos en el eje Y y no mostraba el monto de cada
 * producto sin pasar el cursor. La lista da nombre completo, monto exacto y participación a
 * la vez, y la barra aporta lo único que la gráfica agregaba: el tamaño relativo.
 */
export function PanelProductos({
  items,
  moneda,
  locale,
  labels,
}: {
  items: ProductRevenueResponse['items'];
  moneda: 'GTQ' | 'USD';
  locale: Locale;
  labels: Dictionary['analytics'];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.revenueByProduct}</CardTitle>
      </CardHeader>
      {items.length === 0 ? (
        <p className="mt-3 text-body text-muted-foreground">{labels.empty}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {items.map((p) => (
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
                {/* Tinta neutra, no verde: la cuota de un producto no dice "va bien o mal",
                    solo cuánto pesa. `aria-hidden` porque el porcentaje va en texto al lado. */}
                <div
                  className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-sm bg-muted"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-sm bg-foreground"
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
  );
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * LA PARTICIPACIÓN SE RECALCULA SOBRE EL TOTAL DE LA TABLA, NO SE USA LA DEL BACKEND
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Reporte de Jose (2026-08-24): *"en costos por categoría el total debería sumar al 100% (en
 * participación), está mal"*.
 *
 * El backend calcula `sharePct` DENTRO de cada tipo contable, y hace bien: una categoría de
 * gasto que valga "el 12 % de todo" no significa nada cuando ese "todo" incluye las ventas.
 * Pero esta tabla junta `cogs` Y `opex` en una sola lista, así que mostraba porcentajes de dos
 * bases distintas uno debajo del otro. Medido sobre CarsGT:
 *
 *     cogs · costo_de_ventas   Q 33.359.479   98,3 %   ← de los cogs
 *     opex · payroll           Q  3.474.457   54,5 %   ← de los opex
 *     opex · rent              Q  1.139.900   17,9 %
 *
 * La columna suma 200 %, y ninguna de las dos cifras es la que el dueño está leyendo: él ve
 * una tabla de COSTOS y espera "qué parte de mis costos es esto".
 *
 * ═══ POR QUÉ SE ARREGLA ACÁ Y NO EN EL BACKEND ═══
 *
 * `sharePct` por tipo es correcto y lo consume algo más; cambiarlo allá rompería a ese otro
 * consumidor para arreglar a este. El porcentaje depende de QUÉ conjunto se está mostrando, y
 * quien decide ese conjunto es esta pantalla: acá se filtra a cogs+opex, así que acá se sabe
 * cuál es el total contra el que hay que dividir.
 */
export function participacionSobreElTotal(filas: CategoryBreakdownRow[]): CategoryBreakdownRow[] {
  const total = filas.reduce((n, r) => n + r.total, 0);
  // Sin total no hay proporción que calcular, y dividir daría NaN en cada fila.
  if (total === 0) return filas;
  return filas.map((r) => ({ ...r, sharePct: (r.total / total) * 100 }));
}

/**
 * Costo por categoría.
 *
 * Solo costos: el desglose contesta "en qué se va el dinero". Incluir las categorías de
 * ingreso mezclaría dos preguntas en una tabla y el porcentaje dejaría de leerse.
 */
export function PanelCostos({
  categorias,
  moneda,
  locale,
  labels,
}: {
  categorias: CategoryBreakdownResponse | null;
  moneda: 'GTQ' | 'USD';
  locale: Locale;
  labels: Dictionary['analytics'];
}) {
  const filas = participacionSobreElTotal(
    (categorias?.rows ?? []).filter((r) => r.type === 'cogs' || r.type === 'opex'),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.costByCategory}</CardTitle>
      </CardHeader>
      {filas.length === 0 ? (
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
              {filas.map((r) => (
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
  );
}

/**
 * Tablas accesibles equivalentes a las gráficas.
 *
 * Un lector de pantalla no puede leer un SVG de Recharts, y estos son los números del
 * período. Van en UN componente y se montan una sola vez, fuera de los tabs: un tab oculto
 * de Radix no se renderiza, así que ponerlas dentro las haría desaparecer según qué tab esté
 * abierto — y la accesibilidad de una pantalla no puede depender de eso.
 */
export function TablasAccesibles({
  metricas,
  items,
  moneda,
  locale,
  labels,
}: {
  metricas: PeriodMetricsResponse;
  items: ProductRevenueResponse['items'];
  moneda: 'GTQ' | 'USD';
  locale: Locale;
  labels: Dictionary['analytics'];
}) {
  return (
    <>
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
          {metricas.series.map((p) => (
            <tr key={p.date}>
              <th scope="row">{p.date}</th>
              <td>{formatNumber(p.revenue, locale)}</td>
              <td>{formatNumber(p.cogs + p.opex, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {items.length > 0 && (
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
            {items.map((p) => (
              <tr key={p.productId}>
                <th scope="row">{p.name}</th>
                <td>{formatMoney(p.revenue, moneda, locale)}</td>
                <td>{formatPct(p.revenueSharePct / 100, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
