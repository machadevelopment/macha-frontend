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

  it('el ticket promedio solo usa el ingreso de las filas que sí traen unidades', () => {
    // Un producto con 20 unidades y Q200 en esas filas, más Q800 de ventas sin cantidad.
    // El ticket honesto es 200/20 = 10. Usar el ingreso total daría 1000/20 = 50: cinco
    // veces más, y más inflado mientras más incompleto venga el archivo.
    const r = resumir([
      producto({ name: 'Café', revenue: 1000, units: 20, revenueWithUnits: 200 }),
    ]);
    expect(r.unidades).toBe(20);
    expect(r.ticketPromedio).toBe(10);
  });

  it('suma unidades solo de los productos que las reportan, ignorando los que no', () => {
    const r = resumir([
      producto({ name: 'Café', revenue: 1000, units: 20, revenueWithUnits: 400 }),
      producto({ name: 'Asesoría', revenue: 900 }),
      producto({ name: 'Azúcar', revenue: 600, units: 30, revenueWithUnits: 600 }),
    ]);
    expect(r.unidades).toBe(50);
    expect(r.ticketPromedio).toBe(20); // (400 + 600) / 50
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
