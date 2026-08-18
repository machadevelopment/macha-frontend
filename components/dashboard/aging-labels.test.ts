import { describe, expect, test } from 'bun:test';
import { es } from '@/lib/i18n/dictionaries/es';
import { en } from '@/lib/i18n/dictionaries/en';

/**
 * CU-868kt2eh8 — "no se entiende qué son los números de abajo: 1_30, 31_60".
 *
 * Eran las claves que manda el backend, pintadas tal cual en el eje. Los rótulos ahora
 * viven en `common.agingBucket` porque los comparten DOS pantallas —la gráfica del
 * dashboard y los tabs de cartera de Analítica—, y dos copias terminan diciendo "1–30
 * días" en una y "1 a 30 días" en la otra. Que es de donde viene este ticket.
 */

const TRAMOS = ['current', '1_30', '31_60', '61_90', '90_plus'] as const;

for (const [nombre, d] of [
  ['es', es],
  ['en', en],
] as const) {
  describe(`rótulos de antigüedad · ${nombre}`, () => {
    test('los cinco tramos tienen rótulo', () => {
      // Un tramo sin rótulo rendería `undefined` en el eje, que es peor que la clave cruda.
      for (const t of TRAMOS) expect(d.common.agingBucket[t].length).toBeGreaterThan(0);
    });

    test('NINGUNO deja escapar el formato técnico', () => {
      // El bug literal: `1_30` en pantalla. Se comprueba el guion bajo y también el guion
      // simple, que la regla de rangos de U3 prohíbe — al lado de cifras de dinero se lee
      // como una resta.
      for (const t of TRAMOS) {
        expect(d.common.agingBucket[t]).not.toContain('_');
        expect(d.common.agingBucket[t]).not.toMatch(/\\d-\\d/);
      }
    });

    test('los tramos dicen DÍAS, no solo números', () => {
      // "1 a 30" sin unidad no explica nada: podrían ser facturas, montos o semanas.
      const palabra = nombre === 'es' ? /d[ií]as/i : /days/i;
      for (const t of ['1_30', '31_60', '61_90', '90_plus'] as const) {
        expect(d.common.agingBucket[t]).toMatch(palabra);
      }
    });

    test('el eje dice qué se está viendo', () => {
      // Sin esta línea las barras son montos sin unidad: el usuario no sabe que el criterio
      // de agrupación son los días de vencimiento.
      expect(d.common.agingAxisLabel.split(' ').length).toBeGreaterThan(2);
      expect(d.common.agingAxisLabel).toMatch(nombre === 'es' ? /d[ií]as/i : /days/i);
    });
  });
}
