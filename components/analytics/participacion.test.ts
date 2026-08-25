import { describe, expect, test } from 'bun:test';
import { participacionSobreElTotal } from './paneles';
import type { CategoryBreakdownRow } from '@/lib/api/dashboard';

/**
 * ═══ LA TABLA DE COSTOS SUMABA 200 % (reporte de Jose, 2026-08-24) ═══
 *
 * *"en costos por categoría el total debería sumar al 100 % (en participación), está mal"*.
 *
 * El backend calcula la participación DENTRO de cada tipo contable, y hace bien: un gasto que
 * valga "el 12 % de todo" no dice nada cuando ese todo incluye las ventas. Pero esta tabla
 * junta `cogs` y `opex`, así que mostraba porcentajes de dos bases distintas uno debajo del
 * otro. Medido sobre CarsGT: `costo_de_ventas` al 98,3 % (de los cogs) junto a `payroll` al
 * 54,5 % (de los opex) — la columna sumaba 200 %.
 */
const fila = (
  category: string,
  type: CategoryBreakdownRow['type'],
  total: number,
  sharePct: number,
): CategoryBreakdownRow => ({ category, type, total, transactionCount: 1, sharePct });

describe('participación de la tabla de costos', () => {
  test('la columna suma 100 % aunque mezcle cogs y opex', () => {
    // Las cifras y los `sharePct` de entrada son los REALES de CarsGT.
    const filas = participacionSobreElTotal([
      fila('costo_de_ventas', 'cogs', 33_359_479, 98.3),
      fila('payroll', 'opex', 3_474_457, 54.5),
      fila('rent', 'opex', 1_139_900, 17.9),
      fila('import_customs', 'cogs', 431_935, 1.3),
    ]);

    const suma = filas.reduce((n, r) => n + r.sharePct, 0);
    expect(suma).toBeCloseTo(100, 6);
  });

  test('cada porcentaje es su parte del total de COSTOS, no de su tipo', () => {
    const filas = participacionSobreElTotal([
      fila('costo_de_ventas', 'cogs', 75, 100),
      fila('payroll', 'opex', 25, 100),
    ]);

    // Antes las dos decían 100 %: cada una era el total de su propio tipo.
    expect(filas[0]!.sharePct).toBe(75);
    expect(filas[1]!.sharePct).toBe(25);
  });

  test('sin costos no se divide por cero', () => {
    const filas = participacionSobreElTotal([fila('x', 'opex', 0, 0)]);
    expect(filas[0]!.sharePct).toBe(0);
    expect(Number.isNaN(filas[0]!.sharePct)).toBe(false);
  });

  test('una sola categoría es el 100 %', () => {
    const filas = participacionSobreElTotal([fila('rent', 'opex', 500, 100)]);
    expect(filas[0]!.sharePct).toBe(100);
  });
});
