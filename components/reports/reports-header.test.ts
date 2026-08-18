import { describe, expect, test } from 'bun:test';
import { es } from '@/lib/i18n/dictionaries/es';
import { en } from '@/lib/i18n/dictionaries/en';

/**
 * CU-868krvrxy — la cabecera de descarga del prototipo de Lovable.
 *
 * Lo que se fija acá es la DECISIÓN, no el DOM: cuál reporte se ofrece para descargar, y
 * que el texto no prometa algo distinto de lo que el botón hace.
 */

interface Fila {
  id: string;
  ready?: boolean;
}

/** La regla del componente: el más reciente que tenga contenido. */
const ultimoDescargable = (reports: Fila[]): string | null =>
  reports.find((x) => x.ready !== false)?.id ?? null;

describe('qué reporte se ofrece descargar', () => {
  test('el más reciente, cuando está listo', () => {
    expect(
      ultimoDescargable([
        { id: 'a', ready: true },
        { id: 'b', ready: true },
      ]),
    ).toBe('a');
  });

  test('se SALTA el que quedó sin contenido', () => {
    /*
     * `ready: false` es una generación que falló (CU-868krw2wn): el reporte existe en la
     * lista pero no tiene versión. Ofrecer su descarga daría un error en vez de un archivo
     * — y justo el caso más probable es que sea el más reciente, porque el usuario acaba de
     * intentarlo.
     */
    expect(
      ultimoDescargable([
        { id: 'a', ready: false },
        { id: 'b', ready: true },
      ]),
    ).toBe('b');
  });

  test('sin reportes no se ofrece nada, en vez de un botón muerto', () => {
    // Un control deshabilitado sin explicación es la versión educada del mismo problema.
    expect(ultimoDescargable([])).toBeNull();
  });

  test('`ready` ausente cuenta como listo', () => {
    // Compatibilidad con un backend anterior al despliegue del campo: si se leyera como
    // "no listo", la cabecera desaparecería para todo el histórico ya generado.
    expect(ultimoDescargable([{ id: 'a' }])).toBe('a');
  });

  test('todos fallidos: tampoco se ofrece', () => {
    expect(
      ultimoDescargable([
        { id: 'a', ready: false },
        { id: 'b', ready: false },
      ]),
    ).toBeNull();
  });
});

describe('el texto no promete lo que el botón no hace', () => {
  for (const [nombre, d] of [
    ['es', es],
    ['en', en],
  ] as const) {
    test(`${nombre}: habla del ÚLTIMO reporte, no de un export de datos`, () => {
      /*
       * ═══ POR QUÉ ESTE TEST ═══
       *
       * El prototipo dice "Descarga un resumen consolidado de ventas, gastos, utilidad y
       * margen en formato PDF o Excel" — o sea un export DIRECTO de los datos, sin IA y sin
       * créditos. Ese endpoint NO existe: el backend solo exporta una versión de reporte ya
       * generada por Claude.
       *
       * Copiar el texto del prototipo sobre un botón que baja el último reporte de IA sería
       * mentirle al usuario sobre qué está descargando. Este test falla si alguien
       * "completa" el prototipo pegando esa frase sin que exista el export de verdad.
       */
      const h = d.reports.downloadHeader;
      expect(h.title.length).toBeGreaterThan(0);
      expect(h.subtitle.length).toBeGreaterThan(0);
      const dice = `${h.title} ${h.subtitle}`.toLowerCase();
      expect(dice).toMatch(nombre === 'es' ? /último|reciente/ : /latest|recent/);
    });

    test(`${nombre}: el estado vacío dice qué hacer primero`, () => {
      // "No hay nada" a secas deja al usuario sin salida; la frase tiene que mandarlo al
      // generador de abajo.
      expect(d.reports.downloadHeader.empty.split(' ').length).toBeGreaterThan(4);
    });
  }
});
