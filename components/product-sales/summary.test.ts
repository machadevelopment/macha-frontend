import { describe, expect, it } from 'bun:test';
import { agruparPorCategoria, resumir } from './summary';
import type { ProductRevenue } from '@/lib/api/dashboard';

/**
 * Lo que se prueba aquí es que la pantalla no invente números cuando el Excel del cliente
 * viene incompleto — el caso normal, no el raro. Un error en estos cálculos no se ve: da
 * una cifra plausible en una pantalla financiera, que es la peor forma de estar mal.
 */

function producto(p: Partial<ProductRevenue> & { name: string }): ProductRevenue {
  return {
    productId: p.name,
    name: p.name,
    category: p.category ?? null,
    revenue: p.revenue ?? 0,
    cogs: p.cogs ?? 0,
    grossProfit: p.grossProfit ?? 0,
    grossMarginPct: p.grossMarginPct ?? null,
    units: p.units ?? null,
    revenueWithUnits: p.revenueWithUnits ?? 0,
    transactionCount: p.transactionCount ?? 0,
    revenueSharePct: p.revenueSharePct ?? 0,
    previousRevenue: p.previousRevenue ?? 0,
    trend: p.trend ?? 'flat',
  };
}

describe('resumir — unidades y ticket promedio', () => {
  it('sin ninguna cantidad reportada, unidades y ticket son null y NO cero', () => {
    // El caso mayoritario: el libro trae montos y fechas pero ninguna columna de
    // cantidades. Un 0 aquí diría "se vendieron cero unidades" de productos que
    // facturaron miles, y el ticket promedio saldría de dividir entre ese 0.
    const r = resumir([
      producto({ name: 'Asesoría', revenue: 5000 }),
      producto({ name: 'Mantenimiento', revenue: 3000 }),
    ]);
    expect(r.unidades).toBeNull();
    expect(r.ticketPromedio).toBeNull();
  });

  /**
   * ═══ EL TICKET ES POR VENTA, NO POR UNIDAD (decisión de Keneth, 2026-08-24) ═══
   *
   * Estos dos tests fijaban la definición vieja —ingreso ÷ unidades— y por eso el archivo de
   * una concesionaria mostraba "Sin dato": cada fila ES un vehículo, así que nadie escribe una
   * columna de cantidad. Pero el cambio no es para destapar ese caso: "ticket promedio" en
   * comercio significa cuánto deja una VENTA. Con la definición vieja, una cafetería que vende
   * tres cafés en una transacción mostraba el precio de UN café bajo una etiqueta que promete
   * el valor de la compra.
   */
  it('el ticket es el ingreso dividido entre las VENTAS, no entre las unidades', () => {
    // Tres unidades vendidas en UNA sola venta de Q54. El ticket es 54, no 18.
    const r = resumir([
      producto({ name: 'Café', revenue: 54, units: 3, revenueWithUnits: 54, transactionCount: 1 }),
    ]);
    expect(r.ticketPromedio).toBe(54);
  });

  it('cuenta las ventas de TODAS las filas, también las que no traen cantidad', () => {
    // Excluir las filas sin cantidad inflaría el ticket de los archivos incompletos, que es
    // justo cuando menos hay que exagerar.
    const r = resumir([
      producto({ name: 'Café', revenue: 1000, units: 20, transactionCount: 8 }),
      producto({ name: 'Asesoría', revenue: 900, transactionCount: 2 }),
    ]);
    expect(r.ticketPromedio).toBe(190); // (1000 + 900) / (8 + 2)
  });

  it('sin columna de cantidad SÍ hay ticket: es el caso de la concesionaria', () => {
    // 240 vehículos, uno por fila, sin columna de cantidad. Antes: "Sin dato".
    const r = resumir([producto({ name: 'Escape', revenue: 38_843_310, transactionCount: 240 })]);
    expect(r.unidades).toBeNull(); // esto NO cambia: el archivo no declara unidades
    expect(r.ticketPromedio).toBeCloseTo(161_847.13, 1);
  });

  it('suma unidades solo de los productos que las reportan, ignorando los que no', () => {
    // `unidades` conserva su semántica: sin columna de cantidad no se inventa un número, y
    // contar filas confundiría "ventas" con "unidades" en un libro donde una venta lleva tres.
    const r = resumir([
      producto({ name: 'Café', revenue: 1000, units: 20, transactionCount: 8 }),
      producto({ name: 'Asesoría', revenue: 900, transactionCount: 2 }),
      producto({ name: 'Azúcar', revenue: 600, units: 30, transactionCount: 5 }),
    ]);
    expect(r.unidades).toBe(50);
  });

  it('unidades reportadas en cero no se confunden con la ausencia del dato', () => {
    // `units: 0` es un dato: el producto existe y no movió unidades en el rango. El ticket
    // sigue siendo null porque dividir entre cero no da un promedio, pero las unidades no
    // pueden reportarse como "sin dato" habiéndose reportado.
    const r = resumir([producto({ name: 'Descontinuado', revenue: 0, units: 0 })]);
    expect(r.unidades).toBe(0);
    expect(r.ticketPromedio).toBeNull();
  });

  it('una lista vacía no revienta', () => {
    expect(resumir([])).toEqual({ top: null, lento: null, unidades: null, ticketPromedio: null });
  });
});

describe('resumir — baja rotación', () => {
  it('elige el que cae, no simplemente el que menos vende', () => {
    // Un producto chico pero creciendo no es el problema del dueño; uno grande cayendo sí.
    const r = resumir([
      producto({ name: 'Estrella', revenue: 9000, trend: 'up' }),
      producto({ name: 'Cayendo', revenue: 5000, trend: 'down' }),
      producto({ name: 'Chico pero subiendo', revenue: 100, trend: 'up' }),
    ]);
    expect(r.lento?.name).toBe('Cayendo');
  });

  it('entre varios que caen, el de menos ingreso', () => {
    const r = resumir([
      producto({ name: 'Cae grande', revenue: 8000, trend: 'down' }),
      producto({ name: 'Cae chico', revenue: 300, trend: 'down' }),
    ]);
    expect(r.lento?.name).toBe('Cae chico');
  });

  it('sin ninguno cayendo, cae al de menos ingreso', () => {
    const r = resumir([
      producto({ name: 'Grande', revenue: 8000, trend: 'flat' }),
      producto({ name: 'Chico', revenue: 300, trend: 'flat' }),
    ]);
    expect(r.lento?.name).toBe('Chico');
  });
});

describe('agruparPorCategoria', () => {
  it('suma por familia y ordena de mayor a menor', () => {
    const filas = agruparPorCategoria(
      [
        producto({ name: 'Café', category: 'bebidas', revenue: 300 }),
        producto({ name: 'Té', category: 'bebidas', revenue: 200 }),
        producto({ name: 'Azúcar', category: 'abarrotes', revenue: 400 }),
      ],
      'Sin clasificar',
    );
    expect(filas.map((f) => f.name)).toEqual(['bebidas', 'abarrotes']);
    expect(filas[0]!.revenue).toBe(500);
    // Fracción, no 0-100: es lo que espera `formatPct`.
    expect(filas[0]!.sharePct).toBeCloseTo(500 / 900, 6);
  });

  it('los productos sin categoría se agrupan bajo una etiqueta explícita, no se descartan', () => {
    // Descartarlos haría que las participaciones no sumaran el total y nadie entendería
    // por qué; meterlos en una categoría real sería peor.
    const filas = agruparPorCategoria(
      [
        producto({ name: 'Café', category: 'bebidas', revenue: 300 }),
        producto({ name: 'Suelto', revenue: 700 }),
      ],
      'Sin clasificar',
    );
    expect(filas.map((f) => f.name)).toEqual(['Sin clasificar', 'bebidas']);
    expect(filas.reduce((s, f) => s + f.sharePct, 0)).toBeCloseTo(1, 6);
  });

  it('sin ingresos no divide entre cero', () => {
    const filas = agruparPorCategoria([producto({ name: 'Nada', revenue: 0 })], 'Sin clasificar');
    expect(filas[0]!.sharePct).toBe(0);
  });
});
