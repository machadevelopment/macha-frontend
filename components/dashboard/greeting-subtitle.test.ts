import { describe, expect, test } from 'bun:test';
import { es } from '@/lib/i18n/dictionaries/es';
import { en } from '@/lib/i18n/dictionaries/en';
import type { PeriodKey } from '@/lib/period';

/**
 * CU-868krkqh2 — el subtítulo del saludo tiene que seguir al período.
 *
 * Lo que protege este test NO es el `.replace()` (eso no se rompe solo), sino las dos
 * formas en que este arreglo puede deshacerse SIN QUE NADA FALLE:
 *
 *   1. Alguien "limpia" la plantilla y le quita el `{period}`. El subtítulo vuelve a ser
 *      una frase fija —el bug exacto que reportó Macha— y ni el typecheck ni el render se
 *      quejan: `replace` sobre un texto sin la marca devuelve el texto tal cual.
 *   2. Se agrega una `PeriodKey` nueva (un "últimos 30 días", por ejemplo) y nadie le
 *      escribe su palabra. `greetingPeriod[periodo]` sale `undefined` y el saludo se lee
 *      "Así va tu negocio undefined."
 *
 * El caso 2 se cubre listando las claves a mano y comparándolas contra `PeriodKey`: la
 * anotación de tipo de `TODAS` es lo que hace que agregar una clave a `PeriodKey` sin
 * agregarla acá NO compile.
 */

const TODAS: readonly PeriodKey[] = ['today', 'week', 'month', 'year', 'custom'];

describe.each([
  ['es', es],
  ['en', en],
])('saludo del dashboard (%s)', (_idioma, dict) => {
  test('la plantilla lleva el marcador {period}', () => {
    expect(dict.dashboard.greetingSubtitle).toContain('{period}');
  });

  test('hay una palabra para cada período, y ninguna vacía', () => {
    for (const key of TODAS) {
      const palabra = dict.dashboard.greetingPeriod[key];
      expect(palabra).toBeString();
      expect(palabra.trim()).not.toBe('');
    }
  });

  test('la frase resultante no deja el marcador ni un undefined', () => {
    for (const key of TODAS) {
      const frase = dict.dashboard.greetingSubtitle.replace(
        '{period}',
        dict.dashboard.greetingPeriod[key],
      );
      expect(frase).not.toContain('{period}');
      expect(frase).not.toContain('undefined');
    }
  });
});

/**
 * El pie del delta dice contra QUÉ se compara, y el backend siempre compara contra la
 * ventana del mismo tamaño inmediatamente anterior (`ventanaAnterior`), nunca contra "el
 * mes pasado". Decía "vs. mes anterior" con el filtro en "Este año" — la captura del
 * reporte lo muestra. Si alguien lo vuelve a atar a un mes, esto falla.
 */
describe('pie del delta de los KPI', () => {
  test('no nombra un mes: la ventana de comparación depende del período', () => {
    expect(es.dashboard.kpi.vsPrevious).not.toMatch(/mes/i);
    expect(en.dashboard.kpi.vsPrevious).not.toMatch(/month/i);
  });
});
