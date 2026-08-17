import { describe, expect, test } from 'bun:test';
import { totalDeCartera } from './kpi-header';
import { resultado, utilidadBruta, gastos } from '@/lib/metrics/period-totals';
import { es } from '@/lib/i18n/dictionaries/es';
import { en } from '@/lib/i18n/dictionaries/en';
import type { AgingBuckets } from '@/lib/api/dashboard';

/**
 * CU-868kt29t0 — la fila de seis KPIs del encabezado de Analítica.
 *
 * Lo que se fija acá no es el DOM: son las cuentas y la decisión de qué indicadores conviven,
 * que es donde un producto financiero se rompe de la forma más caras de detectar — dos cifras
 * plausibles y ninguna marcada como sospechosa.
 */

const VACIO: AgingBuckets = { current: 0, '1_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0 };

describe('totalDeCartera', () => {
  test('suma los cinco tramos, no solo los vencidos', () => {
    const b: AgingBuckets = { current: 100, '1_30': 20, '31_60': 3, '61_90': 4, '90_plus': 5 };
    expect(totalDeCartera(b)).toBe(132);
  });

  test('una cartera vacía es cero', () => {
    expect(totalDeCartera(VACIO)).toBe(0);
  });

  test('cuenta también los tramos que el diccionario nombra', () => {
    /*
     * Guarda contra un tramo nuevo que se agregue al backend y a los rótulos pero no acá: si
     * `totalDeCartera` recorriera una lista fija en vez de las claves del objeto, el total
     * dejaría de cuadrar con la tabla del tab y nadie lo notaría — el número seguiría siendo
     * plausible.
     */
    const tramos = Object.keys(es.analytics.arAp.bucket);
    const uno = Object.fromEntries(tramos.map((t) => [t, 1])) as AgingBuckets;
    expect(totalDeCartera(uno)).toBe(tramos.length);
  });
});

describe('los seis indicadores son SEIS cosas distintas', () => {
  /*
   * ═══ POR QUÉ EXISTE ESTE TEST ═══
   *
   * El prototipo de Lovable pedía "Cash Flow" y "Profit" como dos tarjetas. Con el ledger
   * actual son el MISMO número: los movimientos se fechan por la fecha del movimiento (base
   * acumulativa), así que la caja del período es exactamente `revenue - cogs - opex`, que es
   * también la utilidad. Una caja de verdad distinta exige base de EFECTIVO —fechar por
   * cuándo se cobró y se pagó— y hoy ningún endpoint la expone.
   *
   * Dos tarjetas con el mismo número y nombres distintos es PEOR que una: el usuario asume
   * que dos indicadores con nombres diferentes miden cosas diferentes y actúa sobre una
   * diferencia inexistente. Por eso va una sola ("Resultado") y el sexto lugar lo toma el
   * total por cobrar, que es un dato real y distinto de todos los demás.
   *
   * Este test es lo que impide que alguien "complete" el prototipo agregando la tarjeta que
   * falta sin resolver primero el problema de datos.
   */
  const totales = { revenue: 1000, cogs: 400, opex: 200, other: 0 };

  test('resultado y utilidad bruta NO son lo mismo', () => {
    // Si alguien hiciera `utilidadBruta` restando también `opex`, las dos tarjetas de la fila
    // pasarían a mostrar el mismo valor. La distinción es decisión de Jose en CU-868kh8y58.
    expect(utilidadBruta(totales)).toBe(600);
    expect(resultado(totales)).toBe(400);
    expect(utilidadBruta(totales)).not.toBe(resultado(totales));
  });

  test('el margen neto se calcula sobre el resultado, no sobre la utilidad bruta', () => {
    // Es la leyenda "Neto: X%" bajo el margen bruto. Calcularla con `utilidadBruta` daría el
    // mismo porcentaje que el número grande de arriba, y la leyenda no diría nada.
    const bruto = utilidadBruta(totales) / totales.revenue;
    const neto = resultado(totales) / totales.revenue;
    expect(neto).toBeCloseTo(0.4, 10);
    expect(neto).not.toBeCloseTo(bruto, 10);
  });

  test('los gastos de la tarjeta son costo + gasto operativo', () => {
    expect(gastos(totales)).toBe(600);
  });
});

describe('rótulos del encabezado', () => {
  for (const [nombre, d] of [
    ['es', es],
    ['en', en],
  ] as const) {
    test(`${nombre}: los seis tabs y los rótulos del encabezado existen`, () => {
      const a = d.analytics;
      // Una clave faltante rendería `undefined` en el tab o en la tarjeta sin que nada más se
      // rompa: typecheck no lo ve porque el diccionario declara el tipo, no los valores.
      for (const texto of Object.values(a.tabs)) expect(texto.length).toBeGreaterThan(0);
      for (const texto of Object.values(a.header)) expect(texto.length).toBeGreaterThan(0);
    });

    test(`${nombre}: la leyenda de "Resultado" dice QUÉ resta`, () => {
      // Es lo que evita que se lea como si fuera la caja cobrada. Una palabra no alcanza.
      expect(d.analytics.header.resultHint.split(' ').length).toBeGreaterThan(3);
    });

    test(`${nombre}: la leyenda de por cobrar avisa que ignora el período`, () => {
      // Sin esto, ver las mismas cifras al mover el filtro se lee como un filtro roto.
      expect(d.analytics.header.arOpenHint.split(' ').length).toBeGreaterThan(3);
    });
  }
});
