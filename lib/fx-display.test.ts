import { describe, expect, test } from 'bun:test';
import { convertirDesdeBase, montoEnVista, type VistaDeMoneda } from '@/lib/fx-display';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * LA DIRECCIÓN DE LA CONVERSIÓN DE VISTA
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Este archivo existe por UN riesgo concreto: la tasa se guarda como `quote → base` y la
 * ingesta la MULTIPLICA, así que el reflejo natural al escribir la lente es multiplicar
 * también. Habría que dividir. Con 7,7 la diferencia es un factor de 59 — y el resultado no
 * es un error visible sino una cifra plausible en la pantalla principal del producto.
 *
 * No es una hipótesis: el producto ya tiene registrado el mismo tipo de fallo con la `K` de
 * `GTQ 389.9K`, donde perder un carácter cambiaba la cifra por mil sin que nada fallara.
 */
describe('convertir una cifra de la base a la otra moneda', () => {
  const tasa = { rate: 7.7, effectiveDate: '2026-08-01' };

  test('DIVIDE por la tasa, no multiplica', () => {
    // Q 7.700 con "1 USD = 7,7 GTQ" son 1.000 dólares. Multiplicar daría 59.290.
    expect(convertirDesdeBase(7_700, tasa)).toBeCloseTo(1_000, 6);
  });

  test('la vuelta cierra con la fórmula de la ingesta', () => {
    /*
     * La ingesta escribe `amount_base = originalAmount * fxRate`. Si esta lente es la inversa
     * exacta, aplicarla sobre lo que la ingesta produjo devuelve el monto original. Es la
     * comprobación que ata las dos direcciones en vez de afirmar un número suelto.
     */
    const enDolares = 1_234.56;
    const enBaseSegunLaIngesta = enDolares * tasa.rate;
    expect(convertirDesdeBase(enBaseSegunLaIngesta, tasa)).toBeCloseTo(enDolares, 6);
  });

  /*
   * Una tasa inutilizable devuelve `null` y no `Infinity`/`NaN`. El motivo es qué pasa aguas
   * abajo: `formatMoney` sobre `Infinity` produce "GTQ ∞" y sobre `NaN` produce un guion, y
   * las dos cosas se leen como una cifra rota en vez de como "no hay conversión". El `null`
   * obliga a la pantalla a decidir qué mostrar.
   */
  test.each([
    ['cero', 0],
    ['negativa', -7.7],
    ['no finita', Number.NaN],
  ])('una tasa %s no convierte: devuelve null', (_caso, rate) => {
    expect(convertirDesdeBase(100, { rate, effectiveDate: '2026-08-01' })).toBeNull();
  });

  test('un monto no finito tampoco se convierte', () => {
    expect(convertirDesdeBase(Number.NaN, tasa)).toBeNull();
  });
});

describe('la lente aplicada a una vista', () => {
  /*
   * En la vista base es la identidad, y eso es deliberado: las pantallas llaman SIEMPRE a
   * `montoEnVista`, incluso cuando no hay conversión. Si la identidad no estuviera acá, cada
   * pantalla necesitaría un `if` y bastaría con que una se lo olvidara para que mostrara
   * quetzales rotulados como dólares.
   */
  test('mostrar la base no toca la cifra', () => {
    const vista: VistaDeMoneda = { moneda: 'GTQ', esBase: true, tasa: null };
    expect(montoEnVista(48_663.5, vista)).toBe(48_663.5);
  });

  test('mostrar la otra moneda aplica la tasa', () => {
    const vista: VistaDeMoneda = {
      moneda: 'USD',
      esBase: false,
      tasa: { rate: 7.7, effectiveDate: '2026-08-01' },
    };
    expect(montoEnVista(7_700, vista)).toBeCloseTo(1_000, 6);
  });
});
