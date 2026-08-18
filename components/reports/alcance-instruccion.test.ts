import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { es } from '@/lib/i18n/dictionaries/es';
import { en } from '@/lib/i18n/dictionaries/en';

/**
 * CU-868kt96fw — EL CAMPO "ALGO MÁS QUE QUIERAS PEDIRLE" NO SE IGNORA.
 *
 * Macha reportó que el campo se ignora por completo. Se revisaron los payloads reales de
 * pg-boss en producción y el texto NUNCA se perdió: las cuatro instrucciones escritas
 * llegaron enteras al backend y al prompt.
 *
 *   "Incluye ventas por producto"                          → secciones ["kpis"]
 *   "…por producto con costo y venta total por producto"   → secciones ["kpis"]
 *   "sales by product this month"                          → ["kpis","recommendations"]
 *   "Agrega una gráfica de mis ventas por mes…"            → ["kpis","recommendations"]
 *
 * Las CUATRO piden datos por producto con "Productos top" SIN marcar. El snapshot no traía
 * un solo producto, el modelo cumplió la regla de no inventar, y se calló. Desde el otro
 * lado de la pantalla eso se ve exactamente igual que un campo roto.
 *
 * Este archivo fija la mitad de frontend: el usuario ve qué NO está marcado mientras
 * escribe, que es cuando todavía puede arreglarlo con un clic.
 */
describe('aviso de alcance de la instrucción', () => {
  const fuente = readFileSync(join(import.meta.dir, 'report-builder.tsx'), 'utf-8');

  test('el aviso lista las secciones SIN marcar, no las marcadas', () => {
    expect(fuente).toContain('!secciones.includes(s.section)');
  });

  test('NO adivina por palabras clave', () => {
    // Buscar "producto"/"product" en el texto del usuario sería frágil en dos idiomas, con
    // typos y con sinónimos. Un aviso que a veces no aparece enseña a ignorarlo. Este es
    // determinista: si hay secciones sin marcar, se nombran, y punto.
    for (const trampa of ['producto', 'product', 'includes(instrucciones', 'toLowerCase()']) {
      expect(fuente.includes(`instrucciones.${trampa}`)).toBe(false);
    }
    expect(fuente).not.toContain('PALABRAS_CLAVE');
  });

  test('el aviso está junto al campo, no escondido tras el botón', () => {
    const iEtiqueta = fuente.indexOf('labels.instructionsLabel');
    const iAviso = fuente.indexOf('labels.instructionsScope');
    const iTextarea = fuente.indexOf('id="report-instructions"');
    expect(iEtiqueta).toBeGreaterThanOrEqual(0);
    expect(iAviso).toBeGreaterThan(iEtiqueta);
    expect(iAviso).toBeLessThan(iTextarea);
  });
});

describe('textos del aviso', () => {
  test('el marcador {sections} existe en los dos idiomas', () => {
    // Si se pierde, `replace` no falla: deja la frase sin la lista y el aviso pierde todo
    // su valor sin que nada se rompa.
    expect(es.reports.builder.instructionsScope).toContain('{sections}');
    expect(en.reports.builder.instructionsScope).toContain('{sections}');
  });

  test('hay una variante para cuando NO falta ninguna sección', () => {
    // Sin ella, la frase quedaría "están sin marcar: ." con la lista vacía.
    expect(es.reports.builder.instructionsScopeAll).not.toContain('{sections}');
    expect(en.reports.builder.instructionsScopeAll).not.toContain('{sections}');
    expect(es.reports.builder.instructionsScopeAll.length).toBeGreaterThan(10);
    expect(en.reports.builder.instructionsScopeAll.length).toBeGreaterThan(10);
  });

  test('ES y EN dicen cosas distintas (no quedó una copiada de la otra)', () => {
    expect(es.reports.builder.instructionsScope).not.toBe(en.reports.builder.instructionsScope);
  });
});
