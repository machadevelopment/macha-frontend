import { describe, expect, test } from 'bun:test';
import { enCero } from './period-empty-note';
import { es } from '@/lib/i18n/dictionaries/es';
import { en } from '@/lib/i18n/dictionaries/en';

/**
 * CU-868krn2up — el aviso que distingue "no hay nada en este período" de "el producto está
 * roto".
 */

const CERO = { revenue: 0, cogs: 0, opex: 0, other: 0 };

describe('enCero', () => {
  test('los cuatro tipos en cero es un período vacío', () => {
    expect(enCero(CERO)).toBe(true);
  });

  test('CUALQUIERA de los cuatro con movimiento ya no lo es', () => {
    // Se comprueban los cuatro por separado y no solo `revenue`: un mes en que la empresa
    // solo tuvo gastos SÍ tiene datos, y decirle "no hay movimientos en este período"
    // mientras las tarjetas muestran sus gastos sería una contradicción en pantalla.
    for (const campo of ['revenue', 'cogs', 'opex', 'other'] as const) {
      expect(enCero({ ...CERO, [campo]: 1 })).toBe(false);
    }
  });

  test('un monto negativo cuenta como movimiento, no como vacío', () => {
    // No deberían existir montos negativos en el ledger, pero si aparecen, tratarlos como
    // "vacío" taparía el dato raro justo cuando hay que verlo.
    expect(enCero({ ...CERO, other: -5 })).toBe(false);
  });
});

describe('textos del aviso', () => {
  test.each([
    ['es', es],
    ['en', en],
  ])('la plantilla de %s lleva sus dos marcadores', (_idioma, dict) => {
    // Si alguien reescribe la frase y se come un marcador, la fecha desaparece sin que
    // nada falle — y el aviso pierde justo la parte que contesta la pregunta.
    expect(dict.dashboard.emptyPeriod.outsideRange).toContain('{from}');
    expect(dict.dashboard.emptyPeriod.outsideRange).toContain('{to}');
  });

  test.each([
    ['es', es],
    ['en', en],
  ])('el caso sin datos de %s NO lleva marcadores: no hay rango que poner', (_idioma, dict) => {
    expect(dict.dashboard.emptyPeriod.noDataAtAll).not.toContain('{');
  });
});
