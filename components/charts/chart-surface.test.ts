import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

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
