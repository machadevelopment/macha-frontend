import type { PeriodTotals } from '@/lib/api/dashboard';

/**
 * Las cuentas que se hacen sobre los totales de `/metrics/period`, como funciones puras.
 *
 * Estaban escritas dentro de `PeriodKpis` y hubo que volver a escribirlas al montar la fila
 * de KPIs de Analítica (CU-868knx15v). Dos copias de "gastos = cogs + opex" son dos lugares
 * donde una puede cambiar sin la otra, y el síntoma sería el peor posible en un producto
 * financiero: el dashboard y la analítica mostrando dos gastos distintos para el mismo
 * período, los dos plausibles y ninguno señalado como sospechoso.
 *
 * No llevan test propio porque son una línea cada una; lo que las justifica acá es que sean
 * UNA sola definición, no que sean complicadas.
 */

/** Cómo sale el dinero de la cuenta: costo directo + gasto operativo. */
export const gastos = (t: PeriodTotals): number => t.cogs + t.opex;

/**
 * Ingreso menos costo directo, SIN restar `opex` — decisión de Jose en CU-868kh8y58. Es
 * distinto del resultado del período, y por eso conviven las dos.
 */
export const utilidadBruta = (t: PeriodTotals): number => t.revenue - t.cogs;

/** Ingreso menos TODO lo que salió. Es la caja del período, no el margen. */
export const resultado = (t: PeriodTotals): number => t.revenue - gastos(t);

/**
 * Margen bruto como FRACCIÓN (0–1), que es lo que espera `formatPct`.
 *
 * `null` cuando no hubo ventas: un "0.0%" ahí se lee como "vendiste sin ganar" en vez de
 * "no vendiste" (CU-868kh8y58).
 */
export const margenBruto = (t: PeriodTotals): number | null =>
  t.revenue === 0 ? null : utilidadBruta(t) / t.revenue;

/**
 * Variación contra la ventana anterior, en FRACCIÓN y no en puntos porcentuales.
 *
 * `undefined` cuando el período anterior fue cero: no hay base contra qué comparar, y
 * cualquier porcentaje que se invente ahí ("+100%", "∞") sería ruido presentado como dato.
 */
export const delta = (actual: number, previo: number): number | undefined =>
  previo === 0 ? undefined : (actual - previo) / Math.abs(previo);
