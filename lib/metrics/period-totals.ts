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

/**
 * TODO lo que salió: costo directo + gasto operativo.
 *
 * Sigue siendo la base de `resultado()` —ingresos menos todo lo que salió— y por eso no se
 * toca. Lo que dejó de usar es la TARJETA de gastos; ver `gastosOperativos`.
 */
export const gastos = (t: PeriodTotals): number => t.cogs + t.opex;

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * LO QUE PINTA LA TARJETA DE GASTOS: SOLO OPERATIVOS (2026-08-25)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * La tarjeta mostraba `gastos()` —costo directo + operativo— por decisión de CU-868kuw01m, que
 * agregó la tarjeta de Costo Directo a pedido de Jose y conservó Gastos como la suma. La
 * confusión estaba prevista ahí mismo, y la mitigación fue la frase de apoyo: "Costo directo
 * más gastos de operación".
 *
 * No alcanzó, y hay medición. Sobre el archivo de CarsGT, agosto 2026:
 *
 *     Costo directo de ventas   Q 6.033.929
 *     Gastos                    Q 6.358.993   ← el costo directo, otra vez, + Q 325.064
 *
 * Las dos tarjetas están una al lado de la otra y el costo aparece en las dos. Un analista
 * externo leyó la pantalla y tuvo que escribir una nota aclaratoria ("el campo Expenses ahí
 * significa costo directo + costos operativos, por eso se ve tan alto"); Jose lo reportó como
 * doble conteo. Cuando la frase de apoyo tiene que desmentir lo que la cifra sugiere, el
 * problema es la cifra.
 *
 * Ahora la fila se lee como una cuenta de resultados sin repetir nada:
 *
 *     ingresos − costo directo = utilidad bruta − gastos operativos = resultado
 *
 * `resultado()` NO cambia: sigue restando todo. La cifra de abajo es la misma de siempre; lo
 * que cambió es que la de arriba dejó de contar el costo dos veces.
 */
export const gastosOperativos = (t: PeriodTotals): number => t.opex;

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
