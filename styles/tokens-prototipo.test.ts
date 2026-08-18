import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * LOS TOKENS CONTRA EL PROTOTIPO — CU-868kt8bg0
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *
 * El ticket declara el repo del prototipo (`juanrodriguezbz/mvp-macha`) **fuente de verdad
 * visual** y pide alinear los valores conservando nuestra arquitectura de capas.
 *
 * Este test es lo que impide que la alineación se deshaga sola. Los valores objetivo están
 * escritos acá en HSL —tal como los declara `src/index.css` del prototipo— y se comparan
 * contra el hex de nuestro `globals.css`. Si alguien retoca un primitivo "para que se vea
 * mejor", esto lo dice en vez de que el desajuste vuelva a descubrirse en la siguiente
 * ronda de QA, que es como llegó este ticket.
 *
 * NO se prueban los alias de la capa 2 (`--background`, `--foreground`…): esos apuntan a
 * los primitivos, así que fijar el primitivo los cubre. Y no se prueban los tokens que el
 * prototipo no tiene (`--brand`, `--sage`, los de densidad), porque para esos el prototipo
 * no es autoridad.
 */

/** HSL → hex, la misma conversión que se usó para armar la tabla de mapeo del ticket. */
function hslAHex(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const v = l / 100 - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * v)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const css = readFileSync(join(import.meta.dir, '..', 'styles', 'globals.css'), 'utf-8');

/**
 * Lee un primitivo del bloque claro o del oscuro.
 *
 * El bloque oscuro empieza en `.dark {`; se corta ahí para no confundir las dos
 * definiciones del mismo nombre, que es justo lo que hace este archivo (capa 1 por tema).
 */
function primitivo(nombre: string, tema: 'claro' | 'oscuro'): string {
  const inicioOscuro = css.indexOf('.dark');
  const bloque = tema === 'claro' ? css.slice(0, inicioOscuro) : css.slice(inicioOscuro);
  const m = bloque.match(new RegExp(`\\n\\s*--${nombre}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!m) throw new Error(`no se encontró --${nombre} en el bloque ${tema}`);
  return m[1]!.toLowerCase();
}

/** [nuestro primitivo, token del prototipo, HSL del prototipo] */
const CLARO: Array<[string, string, [number, number, number]]> = [
  ['canvas', '--background', [0, 0, 100]],
  ['ink', '--foreground', [0, 0, 9]],
  ['muted', '--muted-foreground', [0, 0, 45]],
  ['border', '--border', [0, 0, 92]],
  ['soft', '--muted', [0, 0, 96]],
  ['green', '--accent', [142, 45, 38]],
  ['red', '--destructive', [0, 65, 48]],
];

const OSCURO: Array<[string, string, [number, number, number]]> = [
  ['canvas', '--background', [0, 0, 7]],
  ['ink', '--foreground', [0, 0, 95]],
  ['muted', '--muted-foreground', [0, 0, 60]],
  ['border', '--border', [0, 0, 17]],
  ['soft', '--muted', [0, 0, 14]],
  ['green', '--accent', [142, 45, 50]],
  ['red', '--destructive', [0, 65, 55]],
];

describe('primitivos alineados al prototipo · claro', () => {
  for (const [nuestro, suyo, hsl] of CLARO) {
    test(`--${nuestro} = ${suyo} hsl(${hsl.join(' ')})`, () => {
      expect(primitivo(nuestro, 'claro')).toBe(hslAHex(...hsl));
    });
  }
});

describe('primitivos alineados al prototipo · oscuro', () => {
  for (const [nuestro, suyo, hsl] of OSCURO) {
    test(`--${nuestro} = ${suyo} hsl(${hsl.join(' ')})`, () => {
      expect(primitivo(nuestro, 'oscuro')).toBe(hslAHex(...hsl));
    });
  }
});

describe('la regla de los dos verdes sobrevive a la alineación', () => {
  test('el funcional y el salvia siguen lejos', () => {
    /*
     * El riesgo real de este ticket. Alinear el verde funcional al prototipo lo DESATURÓ
     * (76 % → 45 %), y eso lo acerca al salvia de marca — que es justo lo que la regla
     * separa. Siguen distinguiéndose, pero el margen se estrechó, así que la distancia se
     * fija acá en vez de confiar en que nadie la toque.
     *
     * Lo que más pesa a simple vista es la LUMINOSIDAD: salvia 65 %, funcional 38 %. Si
     * alguien aclara el funcional "para que se vea mejor en oscuro", este test lo detiene.
     */
    const funcional = primitivo('green', 'claro'); // #358d55 · hsl(142 45% 38%)
    const salvia = '#a0af9a'; //                      hsl(103 12% 65%)

    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      return (Math.max(r!, g!, b!) + Math.min(r!, g!, b!)) / 2;
    };

    // 27 puntos de luminosidad entre ambos. Se exige holgadamente menos para no romperse
    // por un redondeo, pero lo bastante como para que acercarlos de verdad falle.
    expect(Math.abs(lum(salvia) - lum(funcional))).toBeGreaterThan(0.15);
  });
});

/**
 * CU-868kt8bg0 · LA CURVA DE ANIMACIÓN ES UNA SOLA.
 *
 * El prototipo define `ease: [0.2, 0, 0, 1]` a 0,2 s una vez y la reusa en cada componente.
 * Acá vive como el DEFAULT de Tailwind, no como una clase opcional, para que
 * `transition-colors` a secas ya la traiga. Si alguien la mueve a una clase con nombre,
 * las veinte transiciones del producto vuelven en silencio a la curva de fábrica
 * (`cubic-bezier(0.4,0,0.2,1)` a 150 ms) y nada lo delata en pantalla salvo la sensación
 * de que "no es tan suave como el prototipo", que es justo el reporte original.
 */
describe('curva de animación del prototipo', () => {
  const config = readFileSync(join(import.meta.dir, '..', 'tailwind.config.ts'), 'utf-8');

  test('la curva del prototipo es el DEFAULT, no una clase aparte', () => {
    expect(config).toContain("transitionTimingFunction: { DEFAULT: 'cubic-bezier(0.2, 0, 0, 1)' }");
  });

  test('la duración por defecto es la del prototipo (200 ms, no los 150 de fábrica)', () => {
    expect(config).toContain("transitionDuration: { DEFAULT: '200ms' }");
  });
});
