import { formatMoney, formatNumber, formatPct } from '@/lib/format';
import type { CsvValue } from '@/lib/csv/serialize';
import type { ProductRevenue } from '@/lib/api/dashboard';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * Las filas del CSV de Ventas por producto — CU-868knx1a0.
 *
 * Función pura, al lado de `summary.ts` y por el mismo motivo: es donde un error no se ve.
 * El componente arma la descarga; acá se decide qué dice cada celda, que es lo que el
 * dueño se lleva a su Excel y con lo que va a tomar decisiones fuera de la aplicación.
 *
 * DOS DECISIONES QUE GOBIERNAN ESTE ARCHIVO:
 *
 * 1. **Lo que no se sabe va como celda VACÍA, nunca como 0.** Es la misma regla que manda
 *    en la pantalla (ver la nota de cabecera de `product-sales-client.tsx`) y en el CSV
 *    importa MÁS, no menos: en pantalla "Sin dato" está escrito con todas sus letras y el
 *    tooltip lo explica; en un CSV el 0 se ve idéntico a un 0 medido, y además suma. Un
 *    `SUMA()` sobre la columna de unidades con ceros inventados no se equivoca a la vista:
 *    da un total redondo y falso. Vacío es la única celda que Excel no suma y que un
 *    humano lee como "aquí no había dato".
 *
 * 2. **Los montos salen formateados igual que en pantalla**, por los helpers de
 *    `lib/format` y con su código de moneda (GTQ/USD) explícito. El archivo tiene que
 *    poder cuadrarse contra la tabla celda por celda —es para eso que se exporta—, y el
 *    modelo es multimoneda: un número pelado sin código de moneda en un archivo que vive
 *    fuera de la aplicación es un número sin unidad.
 */
export function filasCsvProductos({
  items,
  labels,
  moneda,
  locale,
}: {
  items: ProductRevenue[];
  labels: Dictionary['productSales'];
  moneda: 'GTQ' | 'USD';
  locale: Locale;
}): CsvValue[][] {
  const encabezado: CsvValue[] = [
    labels.colProduct,
    labels.colCategory,
    labels.colUnits,
    labels.colRevenue,
    labels.colCogs,
    labels.colMargin,
    labels.colShare,
    labels.colTrend,
  ];

  const filas = items.map((p): CsvValue[] => [
    p.name,
    // Sin categoría sí lleva etiqueta y no va vacío: la fila existe y pertenece a un
    // grupo real ("Sin clasificar"), que es distinto de un dato que falta.
    p.category ?? labels.uncategorized,
    // `null` = el archivo del cliente no traía columna de cantidades. Celda vacía.
    // `0` = se reportó y no se movió nada: eso sí es un dato y se escribe.
    p.units === null ? null : formatNumber(p.units, locale),
    formatMoney(p.revenue, moneda, locale),
    formatMoney(p.cogs, moneda, locale),
    // `null` = producto sin ventas en el rango; no existe margen que reportar, y un 0%
    // diría que vendió sin ganar nada. La pantalla pone "—"; en el CSV el equivalente
    // honesto es la celda vacía, porque un guión largo lo leería como texto.
    p.grossMarginPct === null ? null : formatPct(p.grossMarginPct / 100, locale),
    formatPct(p.revenueSharePct / 100, locale),
    labels.trend[p.trend],
  ]);

  return [encabezado, ...filas];
}
