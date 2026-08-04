import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * CU-868kkgb3c criterio 4: que el patrón no vuelva a entrar.
 *
 * La auditoría encontró 41 llamadas escritas igual, y no porque nadie supiera que un fetch
 * puede fallar: porque `fetch().then(r => r.json())` es lo que sale natural y nada avisaba.
 * Arreglar las 41 sin poner un tope solo garantiza volver a auditarlo en seis meses.
 *
 * El tope es un test y no una regla de ESLint a propósito: la regla equivalente
 * (`no-restricted-globals` sobre `fetch`) no distingue el fetch del navegador del que
 * hacen los route handlers en `app/api/`, que sí deben usarlo directamente. Acá el alcance
 * se elige por directorio, que es exactamente la distinción que importa.
 */

const RAIZ = join(import.meta.dir, '..', '..');

/** `components/` es 100% cliente: todo su tráfico va por `lib/api/browser.ts`. */
const PROHIBIDO_FETCH = ['components'];

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

/**
 * Quita comentarios antes de buscar. Sin esto el propio comentario que documenta el bug
 * ("antes era `.then(r => r.json())`") haría fallar el test que lo defiende.
 */
function sinComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('el fetch del cliente pasa por lib/api/browser', () => {
  test.each(PROHIBIDO_FETCH)('ningún fetch() crudo en %s/', (raiz) => {
    const infractores = archivosFuente(join(RAIZ, raiz))
      .filter((ruta) => /\bfetch\s*\(/.test(sinComentarios(readFileSync(ruta, 'utf8'))))
      .map((ruta) => ruta.slice(RAIZ.length + 1));

    expect(infractores).toEqual([]);
  });

  /**
   * El segundo patrón del ticket, por si alguien importa `request` y aun así encadena un
   * `.json()` a mano sobre una `Response`.
   */
  test('ningún .then(r => r.json()) en components/', () => {
    const infractores = archivosFuente(join(RAIZ, 'components'))
      .filter((ruta) =>
        /\.then\s*\(\s*\(?\s*\w+\s*\)?\s*=>\s*\w+\s*\.\s*json\s*\(\s*\)/.test(
          sinComentarios(readFileSync(ruta, 'utf8')),
        ),
      )
      .map((ruta) => ruta.slice(RAIZ.length + 1));

    expect(infractores).toEqual([]);
  });

  /** El guardia sirve de algo solo si de verdad mira archivos. */
  test('el barrido encuentra los componentes', () => {
    expect(archivosFuente(join(RAIZ, 'components')).length).toBeGreaterThan(50);
  });
});
