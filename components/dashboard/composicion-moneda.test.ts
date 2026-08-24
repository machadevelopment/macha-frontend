import { describe, expect, test } from 'bun:test';
import { filaBase, monedasExtranjeras, tasaUnica } from './composicion-moneda';
import { es } from '@/lib/i18n/dictionaries/es';
import { en } from '@/lib/i18n/dictionaries/en';
import type { CurrencyCompositionResponse } from '@/lib/api/dashboard';

/**
 * CU-868kj3gnv — la tarjeta de monedas y tasa aplicada del dashboard.
 *
 * Lo que se prueba acá es lo único que puede estar MAL sin que nada se vea roto: la tarjeta
 * se pinta igual de bien con una tasa que no se aplicó a esas filas.
 */

const resp = (
  rows: CurrencyCompositionResponse['rows'],
  multiCurrency = true,
): CurrencyCompositionResponse => ({ baseCurrency: 'GTQ', rows, multiCurrency });

const gtq = {
  currency: 'GTQ' as const,
  originalTotal: 1500,
  baseTotal: 1500,
  transactionCount: 2,
  rate: null,
};
const usd = (min: number, max: number, latest: number) => ({
  currency: 'USD' as const,
  originalTotal: 600,
  baseTotal: 4643,
  transactionCount: 3,
  rate: { min, max, latest, latestDate: '2026-07-31' },
});

describe('tasaUnica', () => {
  test('una sola tasa en el período', () => {
    expect(tasaUnica({ min: 7.72, max: 7.72, latest: 7.72, latestDate: '2026-07-31' })).toBe(true);
  });

  test('varias tasas NO se presentan como una sola', () => {
    /*
     * Es la distinción cara del ticket. Con tres tasas en el mes, 600 USD no son 600 × 7,72
     * sino 4.643. Si la interfaz dijera "tasa aplicada: 7,72", el cliente que multiplique no
     * cuadra y concluye que el dashboard está mal — cuando el que está mal es el rótulo.
     */
    expect(tasaUnica({ min: 7.61, max: 7.83, latest: 7.72, latestDate: '2026-07-31' })).toBe(false);
  });

  test('dos tasas idénticas que vuelven de `numeric` con ruido de coma flotante cuentan como una', () => {
    // `numeric(18,8)` llega como string y `Number` puede dejar diferencia en el último bit.
    // Sin tolerancia, una empresa con UNA tasa vería el texto de rango con min === max.
    expect(
      tasaUnica({ min: 7.72, max: 7.72 + 1e-12, latest: 7.72, latestDate: '2026-07-31' }),
    ).toBe(true);
  });
});

describe('qué filas se pintan', () => {
  test('las extranjeras son las que NO son la base y traen tasa', () => {
    const d = resp([gtq, usd(7.61, 7.83, 7.72)]);
    expect(monedasExtranjeras(d).map((r) => r.currency)).toEqual(['USD']);
    expect(filaBase(d)?.currency).toBe('GTQ');
  });

  test('la moneda base nunca entra en la lista de extranjeras aunque trajera tasa', () => {
    /*
     * Defensa contra un backend que algún día mande `rate` en la fila de la base: pintaría
     * "1,0000" como tasa aplicada de los quetzales, que es ruido con aspecto de dato.
     */
    const conTasaRara = { ...gtq, rate: { min: 1, max: 1, latest: 1, latestDate: '2026-07-31' } };
    expect(monedasExtranjeras(resp([conTasaRara])).length).toBe(0);
  });

  test('sin fila de la moneda base, la tarjeta sigue teniendo sentido', () => {
    // Una empresa que en ese período SOLO facturó en dólares. `filaBase` es opcional.
    expect(filaBase(resp([usd(7.7, 7.7, 7.7)]))).toBeUndefined();
    expect(monedasExtranjeras(resp([usd(7.7, 7.7, 7.7)])).length).toBe(1);
  });
});

describe('los textos', () => {
  test('cada plantilla trae los huecos que el componente rellena', () => {
    // Un hueco mal escrito no falla: se pinta el literal `{rate}` en la cara del cliente.
    for (const d of [es, en]) {
      const c = d.dashboard.currency;
      expect(c.consolidatedIn).toContain('{currency}');
      expect(c.contributed).toContain('{amount}');
      expect(c.rateApplied).toContain('{rate}');
      expect(c.rateApplied).toContain('{date}');
      for (const h of ['{min}', '{max}', '{latest}', '{date}']) {
        expect(c.rateRange, `rateRange sin ${h}`).toContain(h);
      }
      expect(c.notSummed).toContain('{currency}');
    }
  });

  test('el aviso de "no se suman" existe y NO es el mismo texto que el de consolidación', () => {
    /*
     * Son dos ideas distintas y la segunda es la que evita el error caro: que alguien sume
     * quetzales con dólares porque están uno debajo del otro. Si se fusionaran en una sola
     * frase, la advertencia se pierde entre el resto.
     */
    for (const d of [es, en]) {
      const c = d.dashboard.currency;
      expect(c.notSummed.trim()).not.toBe('');
      expect(c.notSummed).not.toBe(c.consolidatedIn);
    }
  });
});
