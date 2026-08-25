import { describe, expect, test } from 'bun:test';
import { es } from '@/lib/i18n/dictionaries/es';
import { en } from '@/lib/i18n/dictionaries/en';
import { dinero } from './read-summary';

/**
 * CU-868krmrcj — los textos de "qué entendimos de tu archivo".
 *
 * Este resumen tiene UNA función: que el dueño de la PYME pueda desmentirlo. Si los textos
 * dejan de ser legibles para él, o si un marcador se pierde y el número desaparece, el panel
 * sigue renderizando perfectamente y deja de servir para nada. Eso es lo que se protege acá.
 */

const MOTIVOS = ['catalogo', 'reporte', 'duplica_otra_hoja', 'ya_ingerida', 'vacia'] as const;

describe.each([
  ['es', es],
  ['en', en],
])('textos del resumen (%s)', (_idioma, dict) => {
  const r = dict.upload.readSummary;

  test('cada motivo de descarte existe y no está vacío', () => {
    for (const motivo of MOTIVOS) {
      expect(r.reason[motivo].trim()).not.toBe('');
    }
  });

  test('los motivos EXPLICAN, no solo etiquetan', () => {
    /*
     * "catálogo" a secas no le dice nada a quien lleva la contabilidad de una cafetería. El
     * texto tiene que decir POR QUÉ no se leyó, en sus palabras. Se exige una longitud mínima
     * porque una etiqueta de una palabra es exactamente el fallo que esto evita.
     *
     * `vacia` queda fuera y no por comodidad: "no tiene filas que leer" YA es la explicación
     * completa. Alargarlo para pasar un umbral sería escribir peor a cambio de un verde.
     */
    for (const motivo of MOTIVOS.filter((m) => m !== 'vacia')) {
      expect(r.reason[motivo].length).toBeGreaterThan(25);
    }
  });

  test('los motivos con conteo conservan su marcador {n}', () => {
    // Sin el marcador, "no se leyó: describe tus clientes" pierde el dato que hace
    // accionable el aviso — cuántas filas se quedaron fuera.
    for (const motivo of MOTIVOS.filter((m) => m !== 'vacia')) {
      expect(r.reason[motivo]).toContain('{n}');
    }
  });

  test('los totales conservan sus dos marcadores', () => {
    expect(r.totals).toContain('{movimientos}');
    expect(r.totals).toContain('{descartadas}');
  });

  test('las hojas con datos conservan sus marcadores', () => {
    expect(r.sheetMovements).toContain('{n}');
    expect(r.sheetInventory).toContain('{creados}');
    expect(r.sheetInventory).toContain('{ajustados}');
  });

  test('el vacío distingue "no guardamos" de "no entendimos nada"', () => {
    // `null` en el backend significa carga anterior a esta función. Decir "no entendimos
    // nada" sobre una carga que sí funcionó sería alarmar sin motivo.
    expect(r.empty.trim()).not.toBe('');
    expect(r.empty.toLowerCase()).not.toContain('error');
  });
});

describe('el resumen se ofrece cuando de verdad hay algo que contar', () => {
  test('no se muestra mientras la carga está en vuelo ni si se canceló', () => {
    // En vuelo no hay resumen todavía; cancelada no llegó a producirlo. Un panel vacío que
    // se llena solo confunde más de lo que ayuda.
    const lista = require('node:fs').readFileSync(
      require('node:path').join(import.meta.dir, 'document-list.tsx'),
      'utf8',
    );
    expect(lista).toContain("!IN_FLIGHT.includes(doc.status) && doc.status !== 'cancelled'");
  });
});

/**
 * La cifra que el cliente reconoce, y la moneda que no siempre conocemos.
 *
 * `montos` sale del ARCHIVO del cliente, así que la moneda puede no ser una de las dos que el
 * producto formatea. Castearle un `'EUR'` a `formatMoney` lo haría pintar el símbolo
 * equivocado sobre una cifra real, que es peor que no formatear: el cliente leería su total en
 * una moneda que no es la suya y no tendría forma de notarlo.
 */
describe('el total de la hoja', () => {
  test('las monedas del producto se formatean con su código', () => {
    expect(dinero(38843310, 'GTQ', 'es')).toContain('GTQ');
    expect(dinero(38843310, 'GTQ', 'es')).toContain('38');
    expect(dinero(4840744, 'USD', 'en')).toContain('USD');
  });

  test('una moneda desconocida muestra su código tal cual, sin inventar símbolo', () => {
    const salida = dinero(1000, 'EUR', 'es');
    expect(salida).toContain('EUR');
    // Lo que NO puede pasar: que se pinte como quetzal o como dólar.
    expect(salida).not.toContain('GTQ');
    expect(salida).not.toContain('$');
  });

  test('el texto del costo conserva su marcador', () => {
    for (const d of [es, en]) {
      expect(d.upload.readSummary.sheetCost).toContain('{monto}');
    }
  });
});
