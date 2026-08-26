'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShareDonut } from '@/components/charts/chart-primitives';
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
  Store,
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
import { formatMoney, formatNumber, formatPct } from '@/lib/format';
import { chartCategorico, chartColors } from '@/components/charts/chart-theme';
import { cn } from '@/lib/cn';
import { csvFileName, serializeCsv } from '@/lib/csv/serialize';
import { descargarCsv } from '@/lib/csv/download';
import { filasCsvProductos } from '@/components/product-sales/csv';
import { agruparPorCategoria, resumir } from '@/components/product-sales/summary';
import { estadoDeTiendas } from '@/components/product-sales/tiendas';
import type {
  ProductRevenue,
  ProductRevenueResponse,
  StoreBreakdownResponse,
} from '@/lib/api/dashboard';
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
  const [tiendas, setTiendas] = useState<StoreBreakdownResponse | null>(null);
  const [error, setError] = useState<RequestError | null>(null);

  const cargar = useCallback(async (r: DateRange) => {
    setError(null);
    // Las dos llamadas van en paralelo y comparten el MISMO rango: si la de tiendas pidiera
    // el suyo por separado, el filtro diría "este mes" y el donut mostraría otra cosa.
    // `limit=200` es el techo del backend: esta pantalla lista el catálogo, no un top 5.
    const [res, porTienda] = await Promise.all([
      request<ProductRevenueResponse>(`/api/metrics-products?from=${r.from}&to=${r.to}&limit=200`),
      request<StoreBreakdownResponse>(`/api/metrics-stores?from=${r.from}&to=${r.to}`),
    ]);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setData(res.data);
    /*
      ═══ SI TIENDAS FALLA, LA PANTALLA SIGUE ═══

      Mismo criterio que el ranking de productos del dashboard: es una tarjeta lateral y
      tumbar la pantalla entera por ella sería peor que no pintarla.

      Y acá no es una precaución teórica. Los dos repos NO despliegan atómico: el día que este
      cambio llegue a Vercel antes que `/metrics/stores` a Railway, el endpoint todavía no
      existe. Con esto, ese rato la tarjeta no aparece y el resto de la pantalla funciona;
      sin esto, Ventas por producto queda caída hasta que el backend alcance.
    */
    setTiendas(porTienda.ok ? porTienda.data : null);
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
          // CU-868ku9u0j: misma causa que la fila de abajo. Estas ya truncan su valor, pero
          // sin `min-w-0` la tarjeta igual reclama el min-content de un nombre de producto
          // largo y desequilibra las cinco columnas.
          /*
            ═══ CU-868ku9rpy · LA FILA COMPACTA, COMO EN EL PROTOTIPO ═══

            El prototipo usa acá exactamente la misma tarjeta chica que en Analítica
            (`card-surface p-4`, tres líneas, `text-xs` para etiqueta y dato de apoyo). La
            forma ya coincidía —etiqueta, valor, sub— pero con el relleno y la escala de la
            tarjeta grande, así que la fila medía más alto que la del prototipo.

            `p-4` sobre `--density-card-p` (16px): el token vale lo mismo hoy, pero se
            escribe explícito porque esta fila sigue al prototipo y no a la densidad general
            — si algún día el token cambia, esta fila no debe moverse con él.

            El dato de apoyo baja a `micro` (10px), que es el mismo token que ya usa la
            tarjeta de KPI del dashboard para su segunda línea. `text-body` (14px) era el
            valor por defecto, no una decisión.
          */
          <Card key={c.label} className="flex flex-col gap-1 p-4">
            <p className="flex items-center justify-between gap-2 font-mono text-eyebrow uppercase text-faint">
              {c.label}
              {c.icon}
            </p>
            <p className="truncate text-cardh2" title={c.value}>
              {c.value}
            </p>
            {c.sub && (
              <p className="truncate font-mono text-micro text-muted-foreground">{c.sub}</p>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 app:grid-cols-[2fr_1fr]">
        {/*
          ═══ CU-868ku9u0j · `min-w-0` EN LAS DOS TARJETAS DE LA FILA ═══

          Jose reportó que la tarjeta del donut "se desplaza a la derecha y no se logra ver".

          Es el MISMO mecanismo que el bug de Inventario (CU-868ktkk3g) y el de los KPIs
          (CU-868ku9q7c): un hijo de grid tiene `min-width: auto`, o sea su ancho de
          min-content. Las celdas de esta tabla llevan `whitespace-nowrap` a propósito —para
          que la tabla desborde con scroll en vez de apilar el texto— así que un nombre de
          producto largo empuja el min-content de la tarjeta izquierda por encima de su `2fr`,
          y la de la derecha se sale de la vista.

          Y explica por qué el `overflow-x-auto` que la tabla YA tiene no servía de nada: si
          la tarjeta crece con el contenido, ese contenedor nunca llega a ver un
          desbordamiento que recortar.

          Con `min-w-0` la tarjeta se achica a su fracción, el `overflow-x-auto` por fin
          muerde, y la tabla scrollea DENTRO de su tarjeta sin empujar a la vecina.
        */}
        <Card>
          <CardHeader>
            <CardTitle>{labels.performance}</CardTitle>
          </CardHeader>
          {/*
            CU-868ktkrqe: antes, `items.length === 0` reemplazaba TODA la pantalla —fila de
            KPIs, esta tarjeta y la de categorías— por una sola tarjeta angosta con el
            mensaje. Un período sin ventas (p. ej. "Hoy") pasaba de un layout ancho de tres
            columnas a un bloque diminuto en una fracción de segundo, y eso es lo que se leía
            como "todo se shiftea al centro" — no había ningún `items-center` de por medio,
            era el propio contenido colapsando de tamaño.

            El precedente ya vive en esta misma pantalla (la tarjeta de categorías, abajo) y
            en el dashboard (`PeriodEmptyNote`): la estructura se queda, y el vacío se explica
            adentro de su propio hueco. `resumir([])` y `agruparPorCategoria([], ...)` ya
            devuelven valores vacíos seguros —por eso la fila de KPIs no necesitó cambios.
          */}
          {items.length === 0 ? (
            <div className="mt-3">
              <p className="text-body text-muted-foreground">{labels.empty}</p>
              <p className="mt-1 text-body text-faint">{labels.emptyHint}</p>
            </div>
          ) : (
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
                      {/*
                        CU-868ku9u0j: el ticket proponía además `truncate` acá. NO se pone,
                        y el motivo está en `table.tsx`: el `whitespace-nowrap` de las celdas
                        es deliberado (CU-868khvzbd) para que la tabla DESBORDE y scrollee en
                        vez de comprimirse hasta una palabra por línea en 390px. Truncar
                        volvería a esconder el nombre del producto, que es la columna que
                        identifica la fila — y con `min-w-0` en la tarjeta ese scroll ya
                        funciona, que era lo que faltaba.
                      */}
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.category ?? labels.uncategorized}
                      </TableCell>
                      <TableCell
                        className={cn('text-right tabular-nums', p.units === null && 'text-faint')}
                        title={p.units === null ? labels.noUnitsHint : undefined}
                      >
                        {p.units === null ? labels.noUnits : formatNumber(p.units, locale)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(p.revenue, moneda, locale)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatMoney(p.cogs, moneda, locale)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {/* `null` = producto sin ventas en el rango; no existe margen, no es 0%. */}
                        {p.grossMarginPct === null
                          ? '—'
                          : formatPct(p.grossMarginPct / 100, locale)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
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
          )}
        </Card>

        {/*
          Las dos tarjetas de participación van APILADAS en la columna angosta, no en una
          tercera columna: la tabla de la izquierda lista hasta 200 productos, así que la
          columna derecha tiene alto de sobra y un `1fr` partido en dos dejaría cada donut
          en la mitad del ancho que necesita para su leyenda.
        */}
        {/*
          `min-w-0` acá y no en las Cards: `Card` ya lo trae de fábrica (CU-868ku9rpy), pero
          este div es el hijo de grid ahora, y sin él vuelve el mismo mecanismo — su
          min-content lo empuja por encima de su `1fr` y la columna se sale de la vista.
        */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{labels.salesByCategory}</CardTitle>
            </CardHeader>
            {porCategoria.length === 0 ? (
              <p className="mt-3 text-body text-muted-foreground">{labels.empty}</p>
            ) : (
              <>
                {/* CU-868knx0vh: por el envoltorio común, igual que la tendencia y el aging.
                  De ahí sale el formato compacto/exacto y el cromo — acá se nota sobre todo
                  en la separación entre rebanadas, que Tremor pinta con una clase de su
                  propio tema que este proyecto nunca registró. */}
                <ShareDonut
                  className="mt-3 h-56"
                  data={porCategoria}
                  index="name"
                  category="revenue"
                  currency={moneda}
                  locale={locale}
                  // Paleta de marca: cada rebanada es una categoría, ninguna es "buena" ni
                  // "mala". Ver `chartCategorico` para la excepción a la regla de los dos verdes.
                  colors={chartCategorico}
                />
                <ul className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
                  {porCategoria.map((c) => (
                    <li key={c.name} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-body">{c.name}</span>
                      <span className="shrink-0 text-body tabular-nums text-muted-foreground">
                        {formatPct(c.sharePct, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          {tiendas && (
            <TarjetaVentasPorTienda
              data={tiendas}
              moneda={moneda}
              locale={locale}
              labels={labels}
            />
          )}
        </div>
      </div>
    </>
  );
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * VENTAS POR TIENDA — CU-868kuw1e3
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *
 * Mismo molde que la tarjeta de categorías de arriba: donut de participación + la lista con
 * el porcentaje. Lo que cambia es el VACÍO, y ahí está todo lo que esta tarjeta tiene de
 * propio.
 *
 * ═══ DOS VACÍOS, PORQUE SON DOS PROBLEMAS DISTINTOS ═══
 *
 * Cuál de los dos toca lo decide `estadoDeTiendas`, que vive aparte y tiene test: es lo único
 * de esta tarjeta que puede estar mal sin que nada se vea roto.
 *
 * ═══ EL MONTO SIN ATRIBUIR SE DICE EN VOZ ALTA ═══
 *
 * La participación se calcula sobre las ventas CON tienda, así que el donut siempre suma
 * 100 %. Si además hay ventas sin tienda, ese 100 % no es el 100 % del período — y callarlo
 * es lo que haría que el dueño lea "NORTE: 60 %" como el 60 % de todo lo que vendió. Se
 * escribe el monto, no un porcentaje: la cifra es comparable con lo que ya ve en su panorama.
 */
function TarjetaVentasPorTienda({
  data,
  moneda,
  locale,
  labels,
}: {
  data: StoreBreakdownResponse;
  moneda: 'GTQ' | 'USD';
  locale: Locale;
  labels: Dictionary['productSales'];
}) {
  const estado = estadoDeTiendas(data);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-3.5 w-3.5 text-faint" strokeWidth={1.7} />
          {labels.salesByStore}
        </CardTitle>
      </CardHeader>

      {estado !== 'ranking' ? (
        <div className="mt-3">
          <p className="text-body text-muted-foreground">
            {estado === 'sin-columna' ? labels.storesEmptyNoColumn : labels.storesEmptyNoSales}
          </p>
          {estado === 'sin-columna' && (
            <p className="mt-1 text-micro text-faint">{labels.storesEmptyNoColumnHint}</p>
          )}
        </div>
      ) : (
        <>
          <ShareDonut
            className="mt-3 h-56"
            data={data.rows}
            index="name"
            category="total"
            currency={moneda}
            locale={locale}
            // Una rebanada por tienda: categorías, no estado. Ver `chartCategorico`.
            colors={chartCategorico}
          />
          <ul className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
            {data.rows.map((t) => (
              <li key={t.storeId} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-body">{t.name}</span>
                <span className="shrink-0 text-body tabular-nums text-muted-foreground">
                  {formatPct(t.sharePct / 100, locale)}
                </span>
              </li>
            ))}
          </ul>
          {data.unattributedTotal > 0 && (
            <p className="mt-3 border-t border-border pt-3 text-micro text-faint">
              {labels.storesUnattributed.replace(
                '{amount}',
                formatMoney(data.unattributedTotal, moneda, locale),
              )}
            </p>
          )}
        </>
      )}
    </Card>
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
