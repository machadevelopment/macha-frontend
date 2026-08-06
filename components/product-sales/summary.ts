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
  /** `null` por lo mismo: sin unidades no hay ticket promedio que calcular. */
  ticketPromedio: number | null;
}

/**
 * Totales de la fila de KPIs.
 *
 * El ticket promedio se calcula con `revenueWithUnits` —el ingreso de las MISMAS filas que
 * aportaron esas unidades— y no con el ingreso total. Mezclarlos infla el ticket en
 * proporción a lo incompleto que venga el archivo del cliente, que es justo cuando menos
 * hay que exagerar: un libro donde solo el 10% de las ventas trae cantidades daría un
 * ticket diez veces mayor que el real, y nada en pantalla lo delataría.
 */
export function resumir(items: ProductRevenue[]): ProductSalesSummary {
  if (items.length === 0) {
    return { top: null, lento: null, unidades: null, ticketPromedio: null };
  }

  const conUnidades = items.filter((p) => p.units !== null);
  const unidades = conUnidades.length === 0 ? null : conUnidades.reduce((s, p) => s + p.units!, 0);
  const ingresoConUnidades = conUnidades.reduce((s, p) => s + p.revenueWithUnits, 0);

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
    ticketPromedio: unidades !== null && unidades > 0 ? ingresoConUnidades / unidades : null,
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
