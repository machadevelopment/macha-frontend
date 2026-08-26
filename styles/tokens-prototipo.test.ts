import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
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

/**
 * CU-868kt8bg0 · "MANTENER EL MISMO REDONDEADO EN TODOS LOS COMPONENTES".
 *
 * La escala de radios es 5/8/10/11/22 px (`tailwind.config.ts`). Antes de este ticket había
 * seis lugares con el radio escrito a mano en la clase, y dos de ellos —`rounded-[7px]` en
 * los ítems del menú y `rounded-[6px]` en dos controles del shell— no eran NINGUNO de los
 * cinco valores de la escala. Un radio de 7 junto a uno de 8 no se ve mal: se ve
 * ligeramente descuidado, sin que nadie pueda señalar qué.
 *
 * El ticket lo pide dos veces: "mismo redondeado en todos los componentes" y "no
 * hardcodear valores en los componentes, todo va al sistema de tokens".
 */
describe('los radios salen de la escala, no de la clase', () => {
  function archivos(dir: string): string[] {
    const salida: string[] = [];
    for (const entrada of readdirSync(dir)) {
      const ruta = join(dir, entrada);
      if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
      else if (entrada.endsWith('.tsx')) salida.push(ruta);
    }
    return salida;
  }

  const RAIZ = join(import.meta.dir, '..');
  const FUENTES = [...archivos(join(RAIZ, 'components')), ...archivos(join(RAIZ, 'app'))];

  test('el recorrido encuentra el frontend (no se rompió en silencio)', () => {
    expect(FUENTES.length).toBeGreaterThan(50);
  });

  /**
   * Los comentarios se quitan ANTES de buscar. Varias cabeceras NOMBRAN el radio viejo al
   * explicar por qué se fue (`rounded-[7px]` en `app-shell`), y sin este paso documentar la
   * decisión rompería el test — que es la forma más segura de que la próxima persona borre
   * la explicación en vez de arreglar el código.
   */
  const sinComentarios = (fuente: string) =>
    fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  test('ningún componente escribe un radio en píxeles', () => {
    const culpables = FUENTES.filter((f) =>
      /rounded-\[\d+px\]/.test(sinComentarios(readFileSync(f, 'utf-8'))),
    ).map((f) => f.slice(RAIZ.length + 1));
    expect(culpables).toEqual([]);
  });

  test('...y el test lo detectaría si volviera a aparecer', () => {
    // Solo se quitan bloques `/* */` y líneas ENTERAS de `//`. Un `//` a media línea no se
    // toca a propósito: distinguirlo de un `https://` o de una barra dentro de una cadena
    // pide un parser, y el precio de equivocarse es borrar código real antes de buscar.
    expect(sinComentarios('    // rounded-[7px]')).not.toContain('rounded-[7px]');
    expect(sinComentarios('<div className="rounded-[7px]" />')).toContain('rounded-[7px]');
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * TODO TOKEN DE COLOR TIENE SU CONTRAPARTE OSCURA (QA de módulos 1-6, 2026-08-26)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Es la clase de defecto que QA reportó como "colores en modo oscuro" y que no se puede ver
 * leyendo el repo: un token definido solo en `:root` se pinta con el valor del tema CLARO
 * cuando el usuario tiene el sistema en oscuro. Sobre una tarjeta `#171717`, un verde apagado
 * o una tinta casi negra desaparecen.
 *
 * Ya pasó dos veces: las barras del dashboard (CU-868krkcwn) y los ticks de eje de Tremor. Y
 * volvió a pasar el mismo día que se escribió este test: los tres degradados del Insight Point
 * animado se agregaron solo a `:root`, con un comentario que afirmaba —falsamente— que los
 * degradados de marca no cambian entre temas. `--brand-gradient` y `--brand-glow` sí cambian.
 *
 * Lo que se exceptúa NO es una lista de nombres sino una regla: lo que no es un color no
 * necesita contraparte. Una pila de fuentes es una pila de fuentes en los dos temas, y un
 * `mask` no pinta —recorta—, así que su negro es la parte opaca del esténcil y no un color que
 * alguien vea.
 */
describe('cobertura de tokens en tema oscuro', () => {
  const css = readFileSync(join(import.meta.dir, 'globals.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );

  /** El bloque de una regla, balanceando llaves — un `indexOf('}')` corta en el primer anidado. */
  const bloque = (desde: number): string => {
    let abiertas = 0;
    const inicio = css.indexOf('{', desde);
    for (let i = inicio; i < css.length; i++) {
      if (css[i] === '{') abiertas++;
      else if (css[i] === '}') {
        abiertas--;
        if (abiertas === 0) return css.slice(desde, i + 1);
      }
    }
    return '';
  };

  const tokens = (s: string) => new Set([...s.matchAll(/--([a-z0-9-]+)\s*:/g)].map((m) => m[1]!));
  const claro = tokens(bloque(css.indexOf(':root')));
  const oscuro = tokens(bloque(css.indexOf('.dark')));

  test('el guardia encuentra los dos bloques', () => {
    expect(claro.size).toBeGreaterThan(50);
    expect(oscuro.size).toBeGreaterThan(50);
  });

  test('ningún token de COLOR se queda sin versión oscura', () => {
    const noEsColor = (v: string) => v === 'font-ui-stack' || v.includes('mask');
    const faltantes = [...claro].filter((v) => !oscuro.has(v) && !noEsColor(v));
    expect(faltantes).toEqual([]);
  });

  /*
   * El bug espejo, y el más difícil de ver: un color cuya ÚNICA definición está en `.dark`
   * nunca aplica en tema claro, así que la pantalla pinta el texto de un tema sobre el fondo
   * del otro. Acá no debería haber ninguno.
   */
  test('ningún token existe SOLO en oscuro', () => {
    expect([...oscuro].filter((v) => !claro.has(v))).toEqual([]);
  });
});
