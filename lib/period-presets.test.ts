import { describe, expect, test } from 'bun:test';
import { computeRange, type PeriodKey } from '@/lib/period';
import { es } from '@/lib/i18n/dictionaries/es';
import { en } from '@/lib/i18n/dictionaries/en';

/**
 * CU-868kt2aga — los presets que faltaban en el selector de fecha.
 *
 * El ticket pide alinear al prototipo, que lista "Hoy, Esta semana, Este mes, Este
 * trimestre, Este año". **"Este trimestre" no existía.** Y "Mes pasado" tampoco, aunque es
 * el rango que más se pide: "¿cómo me fue el mes pasado?" obligaba a abrir el calendario y
 * teclear dos fechas.
 *
 * Las fechas se calculan con `new Date(año, mes, día)` —constructor LOCAL— porque el
 * producto trabaja en GMT-6 y un `Date` construido desde una cadena ISO se lee como UTC:
 * el 1 de agosto se convertiría en el 31 de julio.
 */

/** 15 de agosto de 2026 (mes 7 = agosto). Un día a media semana y a mitad de trimestre. */
const HOY = new Date(2026, 7, 15);

describe('mes pasado', () => {
  test('cubre el mes anterior completo', () => {
    expect(computeRange('lastMonth', HOY)).toEqual({ from: '2026-07-01', to: '2026-07-31' });
  });

  test('en enero retrocede al diciembre del año anterior', () => {
    // El caso que un cálculo ingenuo con `mes - 1` rompe: mes 0 menos 1 no es "diciembre
    // de este año". El constructor de Date lo normaliza solo, y este test lo fija.
    expect(computeRange('lastMonth', new Date(2026, 0, 10))).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
  });

  test('desde marzo da un febrero de 28 o 29 días según el año', () => {
    // Día 0 del mes actual = último del anterior. Sin esa técnica habría que codificar la
    // tabla de 30/31/28/29 y acordarse de los bisiestos.
    expect(computeRange('lastMonth', new Date(2026, 2, 5)).to).toBe('2026-02-28');
    expect(computeRange('lastMonth', new Date(2024, 2, 5)).to).toBe('2024-02-29');
  });
});

describe('este trimestre', () => {
  test('es el trimestre CALENDARIO, no los últimos tres meses', () => {
    // Agosto cae en jul-sep. "Los últimos tres meses" daría may-ago, que no es lo que el
    // contador ni el banco entienden por trimestre.
    expect(computeRange('quarter', HOY)).toEqual({ from: '2026-07-01', to: '2026-09-30' });
  });

  test('los cuatro trimestres caen donde deben', () => {
    expect(computeRange('quarter', new Date(2026, 0, 5)).from).toBe('2026-01-01');
    expect(computeRange('quarter', new Date(2026, 4, 5)).from).toBe('2026-04-01');
    expect(computeRange('quarter', new Date(2026, 8, 5)).from).toBe('2026-07-01');
    expect(computeRange('quarter', new Date(2026, 11, 5))).toEqual({
      from: '2026-10-01',
      to: '2026-12-31',
    });
  });
});

describe('cada preset se puede nombrar en la frase del saludo', () => {
  /*
   * `greetingPeriod` es `Record<PeriodKey, string>` desde este ticket. Antes repetía la
   * unión a mano, así que agregar un preset dejaba el saludo diciendo `undefined` sin que
   * nada fallara. El typechecker ya lo cubre; esto lo fija también en ejecución, porque un
   * `as` mal puesto lo desactivaría en silencio.
   */
  const TODAS: PeriodKey[] = ['today', 'week', 'month', 'lastMonth', 'quarter', 'year', 'custom'];

  for (const [nombre, d] of [
    ['es', es],
    ['en', en],
  ] as const) {
    test(`${nombre}: ninguna clave queda sin frase`, () => {
      for (const k of TODAS) expect(d.dashboard.greetingPeriod[k].length).toBeGreaterThan(0);
    });

    test(`${nombre}: cada preset tiene su etiqueta en el filtro`, () => {
      expect(d.dashboard.period.lastMonth.length).toBeGreaterThan(0);
      expect(d.dashboard.period.quarter.length).toBeGreaterThan(0);
    });
  }
});
