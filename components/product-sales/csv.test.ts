import { describe, expect, it } from 'bun:test';
import { filasCsvProductos } from './csv';
import { es } from '@/lib/i18n/dictionaries/es';
import { en } from '@/lib/i18n/dictionaries/en';
import { serializeCsv, toCsv } from '@/lib/csv/serialize';
import type { ProductRevenue } from '@/lib/api/dashboard';

/**
 * CU-868knx1a0. La regla que se defiende aquí es la misma que gobierna la pantalla: lo que
 * el archivo del cliente no trae sale como celda VACÍA, nunca como 0.
 *
 * En el CSV importa más que en pantalla. Ahí "Sin dato" está escrito y el tooltip lo
 * explica; en una hoja de cálculo un 0 inventado es indistinguible de un 0 medido, y
 * además SUMA: un total de unidades redondo y falso, sin nada que lo delate.
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

const filas = (
  items: ProductRevenue[],
  locale: 'es' | 'en' = 'es',
  moneda: 'GTQ' | 'USD' = 'GTQ',
) =>
  filasCsvProductos({
    items,
    labels: locale === 'es' ? es.productSales : en.productSales,
    moneda,
    locale,
  });

/** Índices de columna, en el mismo orden que la tabla Product Performance. */
const COL = {
  producto: 0,
  categoria: 1,
  unidades: 2,
  ingreso: 3,
  costo: 4,
  margen: 5,
  participacion: 6,
  tendencia: 7,
} as const;

describe('unidades — la regla más importante del export', () => {
  it('units null sale como celda VACÍA, no como 0', () => {
    const [, fila] = filas([producto({ name: 'Asesoría', revenue: 5000 })]);
    expect(fila![COL.unidades]).toBeNull();
    // El fallo que se teme no es que salga `null`: es que salga un cero creíble.
    expect(fila![COL.unidades]).not.toBe('0');
  });

  it('units 0 SÍ se escribe: se reportó y no se movió nada, y eso es un dato', () => {
    const [, fila] = filas([producto({ name: 'Descontinuado', units: 0 })]);
    expect(fila![COL.unidades]).toBe('0');
  });

  it('units con valor se escribe con separadores de miles del locale', () => {
    const [, fila] = filas([producto({ name: 'Café', units: 12345 })]);
    expect(fila![COL.unidades]).toBe('12,345');
  });

  it('una vez serializado, la celda vacía queda vacía de verdad y no dice "null"', () => {
    // Montos de tres cifras a propósito: así ninguna celda trae coma de miles y se
    // puede partir la fila con un `split` sin montar un parser dentro del test.
    const texto = toCsv(filas([producto({ name: 'Asesoría', revenue: 500 })]));
    const celdas = texto.split('\r\n')[1]!.split(',');
    expect(celdas[COL.unidades]).toBe('');
    expect(texto).not.toContain('null');
  });
});

describe('margen y categoría', () => {
  it('margen null (producto sin ventas en el rango) sale vacío, no 0%', () => {
    const [, fila] = filas([producto({ name: 'Sin ventas' })]);
    expect(fila![COL.margen]).toBeNull();
  });

  it('margen 0 sí se escribe: vendió sin ganar nada es un hecho, no una ausencia', () => {
    const [, fila] = filas([producto({ name: 'Al costo', grossMarginPct: 0 })]);
    expect(fila![COL.margen]).toBe('0.0%');
  });

  it('el margen viaja de 0-100 a fracción antes de formatearse', () => {
    const [, fila] = filas([producto({ name: 'Café', grossMarginPct: 42.5 })]);
    expect(fila![COL.margen]).toBe('42.5%');
  });

  it('sin categoría lleva etiqueta, no celda vacía: pertenece a un grupo real', () => {
    const [, fila] = filas([producto({ name: 'Suelto' })]);
    expect(fila![COL.categoria]).toBe(es.productSales.uncategorized);
  });
});

describe('encabezado y moneda', () => {
  it('las columnas son las mismas de la tabla, en el mismo orden', () => {
    const [encabezado] = filas([]);
    expect(encabezado).toEqual([
      es.productSales.colProduct,
      es.productSales.colCategory,
      es.productSales.colUnits,
      es.productSales.colRevenue,
      es.productSales.colCogs,
      es.productSales.colMargin,
      es.productSales.colShare,
      es.productSales.colTrend,
    ]);
  });

  it('sin productos queda solo el encabezado, no un archivo vacío', () => {
    expect(filas([])).toHaveLength(1);
  });

  it('los montos llevan el código de moneda base explícito', () => {
    const [, enQuetzales] = filas([producto({ name: 'Café', revenue: 1234.5 })]);
    expect(enQuetzales![COL.ingreso]).toContain('GTQ');

    const [, enDolares] = filas([producto({ name: 'Café', revenue: 1234.5 })], 'es', 'USD');
    expect(enDolares![COL.ingreso]).toContain('USD');
  });

  it('respeta el idioma: encabezados y tendencia se traducen', () => {
    const [encabezado, fila] = filas([producto({ name: 'Café', trend: 'down' })], 'en');
    expect(encabezado![COL.producto]).toBe('Product');
    expect(fila![COL.tendencia]).toBe('Down');
  });
});

describe('el archivo no se rompe con datos hostiles', () => {
  it('un nombre con coma, comillas y salto de línea no corre las columnas', () => {
    // El monto formateado ya trae una coma de miles (`GTQ 1,234.50`), así que este caso
    // se da con datos perfectamente normales, no solo con nombres raros.
    const texto = serializeCsv(
      filas([
        producto({ name: 'Café "premium", molido\nen bolsa', revenue: 1234.5, units: 1000 }),
        producto({ name: 'Normal', revenue: 10 }),
      ]),
    );

    // Ocho columnas por fila lógica: si el escapado fallara, la fila del nombre hostil
    // aportaría columnas de más y filas de más.
    expect(texto.match(/"/g)?.length).toBeGreaterThan(0);
    expect(texto).toContain('""premium""');
    // La fila normal sigue completa e intacta después de la hostil.
    expect(texto.endsWith(',Estable')).toBe(true);
  });
});
