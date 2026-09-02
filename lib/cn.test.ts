import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { cn } from './cn';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * `tailwind-merge` NO PUEDE BORRAR NUESTROS TAMAÑOS DE TEXTO (2026-09-01)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Su tabla de grupos es la de Tailwind por defecto, así que un `text-body` no le consta como
 * tamaño: lo mete en el grupo de COLOR junto a `text-muted-foreground` y descarta el primero.
 * Pasa en cualquier componente que combine los dos en un `cn()`, y **no falla nada**: el
 * elemento se queda con el 16px del navegador y se ve "grande".
 *
 * Medido en producción: los tabs de Analítica declaran `text-body` (14px) y llegaban al DOM sin
 * esa clase, en 16px.
 */
describe('cn conserva la escala tipográfica del proyecto', () => {
  test('un tamaño propio SOBREVIVE junto a un color de texto', () => {
    // El caso exacto de los tabs.
    expect(cn('text-body text-muted-foreground')).toContain('text-body');
    expect(cn('text-body text-muted-foreground')).toContain('text-muted-foreground');
  });

  test('y sigue ganando el ÚLTIMO tamaño, que es para lo que sirve `cn`', () => {
    /*
     * La mitad que no se puede perder al arreglar la otra: un componente que recibe
     * `className="text-micro"` tiene que poder pisar el `text-body` de su base.
     */
    expect(cn('text-body', 'text-micro')).toBe('text-micro');
  });

  test.each(['micro', 'kpi', 'eyebrow', 'delta', 'pagetitle', 'kpi-sm'])(
    'text-%s no lo borra un color',
    (token) => {
      expect(cn(`text-${token} text-faint`)).toContain(`text-${token}`);
    },
  );

  test('⚠️ la lista de `cn` cubre TODA la escala de `tailwind.config.ts`', () => {
    /*
     * Si alguien agrega un token nuevo a `fontSize` y no lo suma acá, esa clase se empieza a
     * perder en silencio — que es exactamente lo que pasó. El test compara las dos fuentes en
     * vez de confiar en que alguien se acuerde.
     */
    const config = readFileSync(new URL('../tailwind.config.ts', import.meta.url), 'utf8');
    const bloque = config.slice(config.indexOf('fontSize: {'));
    const declarados = [
      ...bloque.slice(0, bloque.indexOf('\n      },')).matchAll(/^\s{8}'?([a-zA-Z0-9-]+)'?:/gm),
    ].map((m) => m[1]!);

    // Guardia del propio test: si el parseo deja de encontrar la escala, esto no prueba nada.
    expect(declarados.length).toBeGreaterThan(20);

    const perdidos = declarados.filter((t) => !cn(`text-${t} text-faint`).includes(`text-${t}`));
    expect(perdidos).toEqual([]);
  });
});
