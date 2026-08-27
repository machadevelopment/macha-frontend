import { montoEnVista, type VistaDeMoneda } from '@/lib/fx-display';
import type {
  AgingBuckets,
  CategoryBreakdownRow,
  PeriodMetricsResponse,
  PeriodTotals,
  ProductRevenue,
} from '@/lib/api/dashboard';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * APLICAR LA LENTE A LAS RESPUESTAS DE MÉTRICAS, CAMPO POR CAMPO
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Analítica pasa sus datos a una docena de paneles que formatean dinero por su cuenta. Hacer
 * que cada panel supiera de conversión sería una docena de lugares donde olvidarse; en vez de
 * eso la conversión pasa UNA vez, acá, en el borde donde los datos entran a la pantalla, y los
 * paneles siguen recibiendo números con una moneda al lado sin enterarse de nada.
 *
 * ═══ ⚠️ CAMPO POR CAMPO Y NUNCA "TODOS LOS NÚMEROS" ═══
 *
 * La tentación obvia es recorrer el objeto y escalar todo lo que sea `number`. Sería un bug
 * silencioso y grande: estas respuestas mezclan dinero con **conteos** (`transactionCount`,
 * `units`) y con **porcentajes** (`sharePct`, `grossMarginPct`, `revenueSharePct`). Dividir un
 * conteo de 240 transacciones por 7,7 da 31, que se pinta sin fallar y es falso; dividir un
 * margen de 38 % da 4,9 %, que es un dato de negocio inventado.
 *
 * Por eso cada función nombra sus campos, y hay test de que los que no son dinero salen
 * intactos. Cuando alguien agregue un campo a una de estas formas, TypeScript no lo va a
 * avisar —un spread no falla por un campo de más— así que el test es la única red.
 *
 * ═══ LO QUE NO SE ESCALA PORQUE NO CAMBIA ═══
 *
 * Los porcentajes y los deltas son razones entre dos cifras de la MISMA moneda: dividir arriba
 * y abajo por la misma tasa las deja igual. Un margen del 38 % es 38 % en quetzales y en
 * dólares. Escalarlos sería el error simétrico al de escalar un conteo.
 */

/** `null` cuando la vista no puede convertir (ver `convertirDesdeBase`). */
function esc(n: number, vista: VistaDeMoneda): number {
  /*
   * Se cae al valor SIN convertir en vez de propagar el `null` por estas formas. Es la
   * decisión menos mala de las dos: `useVistaDeMoneda` ya garantiza que una vista no-base
   * trae una tasa utilizable, así que llegar acá con `null` significa que algo se rompió, y
   * ante eso una cifra en la moneda base es un dato real —solo que rotulado de más— mientras
   * que un `NaN` recorrería los paneles y saldría formateado como si fuera dinero.
   */
  return montoEnVista(n, vista) ?? n;
}

export function totalesEnVista(t: PeriodTotals, vista: VistaDeMoneda): PeriodTotals {
  if (vista.esBase) return t;
  return {
    revenue: esc(t.revenue, vista),
    cogs: esc(t.cogs, vista),
    opex: esc(t.opex, vista),
    other: esc(t.other, vista),
  };
}

export function metricasEnVista(
  m: PeriodMetricsResponse,
  vista: VistaDeMoneda,
): PeriodMetricsResponse {
  if (vista.esBase) return m;
  return {
    ...m,
    /*
     * `baseCurrency` se reescribe a la moneda de la VISTA y no se deja la original. Es el
     * campo del que varios paneles sacan el rótulo de sus cifras: dejarlo en GTQ con los
     * números ya divididos pintaría dólares rotulados como quetzales, que es exactamente el
     * fallo que todo este diseño existe para hacer imposible.
     */
    baseCurrency: vista.moneda,
    current: totalesEnVista(m.current, vista),
    previous: totalesEnVista(m.previous, vista),
    // `date` viaja intacto: el spread lo conserva y solo se pisan los cuatro montos.
    series: m.series.map((p) => ({ ...p, ...totalesEnVista(p, vista) })),
  };
}

export function productosEnVista(items: ProductRevenue[], vista: VistaDeMoneda): ProductRevenue[] {
  if (vista.esBase) return items;
  return items.map((p) => ({
    ...p,
    revenue: esc(p.revenue, vista),
    cogs: esc(p.cogs, vista),
    grossProfit: esc(p.grossProfit, vista),
    revenueWithUnits: esc(p.revenueWithUnits, vista),
    previousRevenue: esc(p.previousRevenue, vista),
    /*
     * NO se tocan y cada uno por su motivo: `units` y `transactionCount` son conteos;
     * `grossMarginPct` y `revenueSharePct` son razones entre cifras de la misma moneda;
     * `trend` es una dirección. Ver la cabecera.
     */
  }));
}

export function categoriasEnVista(
  filas: CategoryBreakdownRow[],
  vista: VistaDeMoneda,
): CategoryBreakdownRow[] {
  if (vista.esBase) return filas;
  // `transactionCount` y `sharePct` sobreviven al spread sin tocarse, que es lo correcto.
  return filas.map((f) => ({ ...f, total: esc(f.total, vista) }));
}

export function carteraEnVista(b: AgingBuckets, vista: VistaDeMoneda): AgingBuckets {
  if (vista.esBase) return b;
  return {
    current: esc(b.current, vista),
    '1_30': esc(b['1_30'], vista),
    '31_60': esc(b['31_60'], vista),
    '61_90': esc(b['61_90'], vista),
    '90_plus': esc(b['90_plus'], vista),
  };
}
