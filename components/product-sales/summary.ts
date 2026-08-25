import type { ProductRevenue } from '@/lib/api/dashboard';

/**
 * Los dos cálculos de la fila de KPIs de Ventas por producto, como funciones puras.
 *
 * Viven fuera del componente para poder probarlos: son la parte de esa pantalla donde un
 * error no se ve —darían un número plausible— y donde equivocarse le mete al dueño una
 * cifra inventada en una pantalla financiera. El resto del componente es maquetación.
 */

export interface ProductSalesSummary {
  top: ProductRevenue | null;
  lento: ProductRevenue | null;
  /** `null` = NINGÚN producto reportó cantidades. Distinto de 0 unidades vendidas. */
  unidades: number | null;
  /**
   * Ingreso ÷ cantidad de VENTAS. `null` solo si no hubo ninguna venta en el período.
   *
   * ═══ ERA POR UNIDAD Y AHORA ES POR VENTA (decisión de Keneth, 2026-08-24) ═══
   *
   * Sale del reporte de Jose: en el archivo de una concesionaria decía "Sin dato", porque se
   * calculaba con las unidades y ese archivo no trae columna de cantidad — cada fila ES un
   * vehículo, así que declarar "1" sería redundante y nadie lo escribe.
   *
   * El cambio no es solo para destapar ese caso: "ticket promedio" en comercio significa
   * cuánto deja una VENTA, no cuánto cuesta una unidad. Con la definición vieja, una cafetería
   * que vende tres cafés en una transacción mostraba el precio de UN café bajo una etiqueta
   * que promete el valor de la compra.
   *
   * ⚠️ Cambia el número para las empresas que SÍ traen cantidades: el ticket sube en la misma
   * proporción en que sus ventas agrupen más de una unidad. Es deliberado — antes la etiqueta
   * y la cifra no coincidían.
   *
   * Y ya no necesita `revenueWithUnits`: la cantidad de ventas la trae toda fila, con columna
   * de cantidad o sin ella.
   */
  ticketPromedio: number | null;
}

/**
 * Totales de la fila de KPIs.
 *
 * `unidades` sigue siendo `null` cuando ningún producto reportó cantidades, y eso NO se
 * cambia: sin columna de cantidad el archivo de verdad no dice cuántas unidades se vendieron,
 * y contar filas confundiría "ventas" con "unidades" en un libro donde una venta puede
 * llevarse tres. Un "Sin dato" honesto es mejor que un número inventado.
 *
 * El ticket promedio, en cambio, ya no depende de eso: ver la nota en su declaración.
 */
export function resumir(items: ProductRevenue[]): ProductSalesSummary {
  if (items.length === 0) {
    return { top: null, lento: null, unidades: null, ticketPromedio: null };
  }

  const conUnidades = items.filter((p) => p.units !== null);
  const unidades = conUnidades.length === 0 ? null : conUnidades.reduce((s, p) => s + p.units!, 0);

  // Sobre TODAS las filas, no solo las que traen cantidad: una venta es una venta aunque su
  // fila no declare unidades, y excluirla inflaría el ticket de los archivos incompletos.
  const ventas = items.reduce((n, p) => n + p.transactionCount, 0);
  const ingresoTotal = items.reduce((n, p) => n + p.revenue, 0);

  // El backend ya devuelve la lista ordenada por ingreso descendente.
  const top = items[0] ?? null;

  // "Baja rotación": primero los que van a la baja, y entre ellos el de menos ingreso. Es
  // la pregunta "¿qué se me está quedando quieto?", no "¿cuál vende menos?" — un producto
  // chico pero creciendo no es un problema, y uno grande que cae sí.
  const lento =
    [...items].sort((a, b) => {
      const peso = (p: ProductRevenue) => (p.trend === 'down' ? -1 : p.trend === 'up' ? 1 : 0);
      if (peso(a) !== peso(b)) return peso(a) - peso(b);
      return a.revenue - b.revenue;
    })[0] ?? null;

  return {
    top,
    lento,
    unidades,
    ticketPromedio: ventas > 0 ? ingresoTotal / ventas : null,
  };
}

/**
 * Ingreso por familia comercial, de mayor a menor.
 *
 * Se agrupa en el cliente y no con otro endpoint porque cada producto ya trae su categoría:
 * pedirla otra vez sería una segunda consulta al mismo dato, con el riesgo de que las dos
 * respuestas no cuadren si el rango cambia entre una y otra.
 */
export function agruparPorCategoria(
  items: ProductRevenue[],
  etiquetaSinCategoria: string,
): Array<{ name: string; revenue: number; sharePct: number }> {
  const total = items.reduce((s, p) => s + p.revenue, 0);
  const porNombre = new Map<string, number>();
  for (const p of items) {
    const clave = p.category ?? etiquetaSinCategoria;
    porNombre.set(clave, (porNombre.get(clave) ?? 0) + p.revenue);
  }
  return [...porNombre.entries()]
    .map(([name, revenue]) => ({ name, revenue, sharePct: total === 0 ? 0 : revenue / total }))
    .sort((a, b) => b.revenue - a.revenue);
}
