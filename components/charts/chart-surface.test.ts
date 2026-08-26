import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { chartCategorico, chartColors } from './chart-theme';

/**
 * CU-868knx0vh: que el estilo de los charts no se vuelva a repartir por pantalla.
 *
 * El rediseño encontró tres pantallas montando el `AreaChart`/`BarChart` de Tremor a mano,
 * cada una con su propia combinación de siete props de estilo. No coincidían, y no podían:
 * con la decisión escrita en tres lugares, que los tres se muevan juntos depende de que
 * quien toca uno sepa que los otros dos existen. Unificarlas en `chart-primitives.tsx` sin
 * poner un tope solo garantiza volver a auditarlo.
 *
 * El tope es un test y no una regla de ESLint porque la distinción que importa es POR
 * DIRECTORIO: `components/charts/` sí debe importar de Tremor —es el envoltorio—, y el
 * resto no. Es el mismo criterio de `lib/api/no-raw-fetch.test.ts`.
 */

const RAIZ = join(import.meta.dir, '..', '..');

/** Los charts de Tremor: los que tienen ejes, degradado y tooltip que unificar. */
const CHARTS_TREMOR = ['AreaChart', 'BarChart', 'DonutChart', 'LineChart', 'ScatterChart'];

function archivosFuente(dir: string): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    if (entrada === 'node_modules' || entrada.startsWith('.')) continue;
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) salida.push(...archivosFuente(ruta));
    else if (/\.tsx?$/.test(entrada) && !/\.test\.tsx?$/.test(entrada)) salida.push(ruta);
  }
  return salida;
}

/** Sin esto, el comentario que documenta la regla haría fallar al test que la defiende. */
function sinComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const RELATIVA = (ruta: string) => ruta.slice(RAIZ.length + 1);

describe('los charts pasan por components/charts/chart-primitives', () => {
  test('solo el envoltorio importa charts de @tremor/react', () => {
    const permitido = join(RAIZ, 'components', 'charts', 'chart-primitives.tsx');

    const infractores = [
      ...archivosFuente(join(RAIZ, 'components')),
      ...archivosFuente(join(RAIZ, 'app')),
    ]
      .filter((ruta) => ruta !== permitido)
      .filter((ruta) => {
        const fuente = sinComentarios(readFileSync(ruta, 'utf8'));
        const importaTremor = /from\s+'@tremor\/react'/.test(fuente);
        if (!importaTremor) return false;
        // Importar solo TIPOS (p. ej. `CustomTooltipProps` en chart-tooltip.tsx) es
        // legítimo: no monta un chart, solo se ata a la firma del que sí lo monta.
        return CHARTS_TREMOR.some((c) => new RegExp(`\\b${c}\\b`).test(fuente));
      })
      .map(RELATIVA);

    expect(infractores).toEqual([]);
  });

  /**
   * El hallazgo que originó todo esto: un objeto de estilo esparcido como props sueltas
   * sobre el chart NO llega al SVG — Tremor reenvía lo que no conoce al `<div>`
   * contenedor. Ver el comentario largo de `chart-theme.ts` con la verificación.
   */
  test('chart-theme no vuelve a exportar un objeto de estilo de eje', () => {
    const fuente = readFileSync(join(RAIZ, 'components', 'charts', 'chart-theme.ts'), 'utf8');
    expect(sinComentarios(fuente)).not.toMatch(/export\s+const\s+chartAxisStyle/);
  });

  /** El estilo del SVG solo llega por CSS, y este es el gancho. */
  test('globals.css define el cromo de .macha-chart', () => {
    const css = readFileSync(join(RAIZ, 'styles', 'globals.css'), 'utf8');
    for (const regla of [
      '.macha-chart .recharts-cartesian-axis-tick-value',
      '.macha-chart .recharts-cartesian-grid line',
      '.macha-chart .recharts-tooltip-cursor',
    ]) {
      expect(css).toContain(regla);
    }
    /*
     * Ningún hex en el cromo del chart: todo sale de tokens, que son los que tienen
     * versión clara y oscura. Los comentarios se quitan primero — este bloque CITA los
     * hex que Tremor trae quemados (`#d1d5db`) para explicar por qué se redefinen, y esa
     * cita es justamente lo que el test debe permitir.
     */
    const sinComentariosCss = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const bloque = sinComentariosCss.slice(sinComentariosCss.indexOf('.macha-chart'));
    expect(bloque).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  /** El guardia sirve de algo solo si de verdad mira archivos. */
  test('el barrido encuentra los componentes', () => {
    expect(archivosFuente(join(RAIZ, 'components')).length).toBeGreaterThan(50);
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * LOS ALTOS DE GRÁFICA SALEN DE UNA MEDICIÓN, Y NADIE LOS ESCRIBE A MANO
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *
 * Jose reportó (2026-08-20) que las gráficas de Analítica se ven "mucho más grandes" que las
 * del prototipo. La causa medida fue el ALTO, y no estaba en el default del componente sino en
 * el `alto="h-96"` (384px) que la pantalla de Analítica le pasaba en sus tabs — o sea, en un
 * string suelto lejos de donde se decide el estilo de los charts.
 *
 * Ese es exactamente el modo de fallo que `chart-primitives.tsx` existe para evitar, un nivel
 * más adentro: la pieza estaba unificada, y el TAMAÑO se seguía decidiendo por pantalla.
 *
 * Los dos tests de acá cierran las dos mitades: que los valores sigan siendo los medidos, y que
 * nadie vuelva a escribir un alto a mano sobre un chart.
 */
describe('altos de gráfica: medidos y en un solo lugar', () => {
  const primitivos = readFileSync(join(import.meta.dir, 'chart-primitives.tsx'), 'utf8');

  test('los valores son los del prototipo, no otros', () => {
    /*
     * Medido contra `juanrodriguezbz/mvp-macha`:
     *   · área de tendencia          → 240px  (`h-60`)
     *   · área a ancho completo       → 260px  (`h-64` = 256, lo más cercano de la escala)
     *   · barras                      → 320px  (`h-80`)
     *
     * Si alguien los cambia, que sea con una medición nueva y actualizando este test — no
     * subiéndolos porque "se ve mejor más grande", que es de donde salió el `h-96`.
     */
    expect(primitivos).toMatch(/area:\s*'h-60'/);
    expect(primitivos).toMatch(/areaWide:\s*'h-64'/);
    expect(primitivos).toMatch(/bars:\s*'h-80'/);
  });

  test('ninguna pantalla le pone un alto a mano a un chart', () => {
    /*
     * El `alto="h-96"` de Analítica es el caso real. Se busca la asignación de un alto de
     * Tailwind al prop `alto` o al `className` de un chart, en cualquier archivo que NO sea
     * `components/charts/`.
     *
     * `h-64` en un ESQUELETO de carga no cuenta y por eso el patrón exige el prop `alto=` o un
     * `className` sobre un chart: el placeholder tiene que medir lo mismo que la gráfica que
     * va a reemplazar, y ese valor sale de la constante igual que el otro.
     */
    const culpables: string[] = [];
    for (const ruta of archivosFuente(RAIZ)) {
      if (ruta.includes(join('components', 'charts'))) continue;
      const texto = readFileSync(ruta, 'utf8');
      if (/\balto=["']h-\d+["']/.test(texto)) culpables.push(ruta.replace(RAIZ + '/', ''));
    }
    expect(culpables).toEqual([]);
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * TODO COLOR DE SERIE ESTÁ EN EL SAFELIST DE TAILWIND
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * El aviso de `chart-theme.ts` es literal: Tremor arma su clase en tiempo de ejecución
 * (`fill-sage-500`), así que Tailwind no la ve al compilar y la purga — y la serie **sale
 * negra**. No es hipotético: este proyecto ya se encontró con los ticks de eje en negro sobre
 * tarjeta oscura porque las clases del tema de Tremor nunca se registraron.
 *
 * Este test recorre los colores que el código declara y exige que el patrón del safelist los
 * cubra. Un color nuevo en `chart-theme.ts` sin su entrada en `tailwind.config.ts` falla acá,
 * en vez de fallar en la pantalla de un cliente.
 */
describe('los colores de serie están en el safelist', () => {
  const config = readFileSync(join(RAIZ, 'tailwind.config.ts'), 'utf8');

  /** Los patrones del safelist, extraídos del config y compilados de verdad. */
  const patrones = [...config.matchAll(/pattern:\s*\n?\s*(\/[^\n]+\/)/g)].map((m) => {
    const cuerpo = m[1]!.slice(1, m[1]!.lastIndexOf('/'));
    return new RegExp(cuerpo);
  });

  test('el config declara al menos un patrón compilable', () => {
    expect(patrones.length).toBeGreaterThan(0);
  });

  test.each([...Object.values(chartColors), ...chartCategorico])(
    '`%s` genera clases que el safelist conserva',
    (color) => {
      // La forma exacta que Tremor emite para el relleno de una serie.
      const clase = `fill-${color}-500`;
      expect(patrones.some((re) => re.test(clase))).toBe(true);
    },
  );
});
