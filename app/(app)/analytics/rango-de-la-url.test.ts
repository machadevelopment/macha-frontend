import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { validateCustomRange } from '@/lib/period';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * EL RANGO SE LEE EN EL SERVIDOR Y CON LA MISMA VALIDACIÓN QUE EL SELECTOR (2026-09-01)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Dos afirmaciones sobre el eslabón que conecta la URL con la pantalla, y las dos tienen su
 * fallo documentado en este repo:
 *
 *  1. **Se lee en el SERVIDOR.** Leído en el cliente, quien abre el enlace vería primero el mes
 *     en curso y después un salto — exactamente lo que `/upload?doc=` ya documenta.
 *  2. **Se valida con `validateCustomRange`, la MISMA del selector.** Una segunda validación se
 *     separaría de la primera y la URL aceptaría rangos que el formulario rechaza.
 */
const fuente = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('el rango del enlace de Analítica', () => {
  test('se lee en el SERVIDOR, de `searchParams`', () => {
    // Si esto cae, el rango se movió al cliente y el enlace produce un salto visible.
    expect(fuente).toContain('searchParams');
    expect(fuente).not.toContain("'use client'");
  });

  test('valida con la MISMA función que el selector, no con una propia', () => {
    expect(fuente).toContain('validateCustomRange');
  });

  test('lo que `validateCustomRange` rechaza es lo que la URL tiene que descartar', () => {
    /*
     * Se ejercita la función de verdad, no la página: es donde vive el criterio. Un rango
     * incompleto, invertido o futuro degrada a "este mes" **sin error** — un enlace de hace
     * tres días no puede terminar en una pantalla rota.
     */
    const hoy = new Date(2026, 8, 1);
    expect(validateCustomRange('2026-01-01', '2026-06-30', hoy)).toBeNull();
    expect(validateCustomRange('', '2026-06-30', hoy)).toBe('incomplete');
    expect(validateCustomRange('2026-06-30', '2026-01-01', hoy)).toBe('reversed');
    expect(validateCustomRange('2026-01-01', '2027-01-01', hoy)).toBe('future');
  });
});
