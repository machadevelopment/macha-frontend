import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { es } from '@/lib/i18n/dictionaries/es';
import { en } from '@/lib/i18n/dictionaries/en';

/**
 * El MARCO de "Filas marcadas" — Jose, 2026-08-20: "está muy compleja, no se logra entender qué
 * tiene que hacer el equipo de MACHA ahí".
 *
 * La pantalla ya explicaba cada FILA (motivo legible, campos con etiqueta, botones nombrados).
 * Lo que no explicaba era la COLA. Un texto de contexto es la clase de cosa que se borra en el
 * primer refactor "de limpieza" sin que nada falle, así que queda fijado acá.
 */

const FUENTE = readFileSync(new URL('./staging-rows-panel.tsx', import.meta.url), 'utf8');

describe.each([
  ['es', es],
  ['en', en],
])('el contexto de la cola (%s)', (_idioma, dict) => {
  const s = dict.admin.stagingRows;

  test('el intro dice de dónde salen estas filas', () => {
    // Sin esto, un operador nuevo ve una lista de tarjetas y no tiene idea de qué las produjo.
    const t = s.intro.toLowerCase();
    expect(['excel', 'spreadsheet', 'sube', 'upload'].some((p) => t.includes(p))).toBe(true);
  });

  test('el intro dice la CONSECUENCIA de no resolverlas', () => {
    /*
     * Es lo único que le da urgencia al trabajo, y lo que no estaba en ninguna parte: la fila
     * no está en la contabilidad del cliente todavía, así que su dashboard está incompleto
     * mientras siga acá. Sin eso, la cola se lee como un buzón opcional.
     */
    const t = s.intro.toLowerCase();
    expect(
      ['dashboard', 'contabilidad', 'books', 'faltan', 'missing'].some((p) => t.includes(p)),
    ).toBe(true);
  });

  test('el alcance dice qué NO le toca a staff', () => {
    /*
     * Desde el acuerdo con Semi (2026-08-20) el CLIENTE contesta sus propios conceptos durante
     * la subida. Sin decirlo, un operador puede pasar la tarde poniendo categorías que el dueño
     * del negocio iba a contestar mejor — y encima pisándolo, porque su respuesta vale más.
     */
    const t = s.introScope.toLowerCase();
    expect(['cliente', 'client'].some((p) => t.includes(p))).toBe(true);
  });

  test('el intro NO habla de "esta fila": es el marco, no una instrucción', () => {
    // Ese era el bug exacto: el único texto de pantalla decía "Revisa ESTA fila" arriba de
    // veinte. Si alguien vuelve a mezclarlos, esto falla.
    expect(s.intro.toLowerCase()).not.toMatch(/esta fila|this row/);
    expect(s.introScope.toLowerCase()).not.toMatch(/esta fila|this row/);
  });

  test('la instrucción por fila se conserva, no se reemplazó', () => {
    // El ticket lo pide explícitamente: el problema no era la fila individual.
    expect(s.instructions.trim()).not.toBe('');
    expect(s.instructions.toLowerCase()).toMatch(/esta fila|this row/);
  });
});

describe('el marco se muestra en TODOS los estados de la pantalla', () => {
  test('incluida la cola vacía, que es el estado que más lo necesitaba', () => {
    /*
     * Antes el `return` de vacío salía antes de cualquier texto: alguien entraba, leía "Sin
     * filas pendientes" y no podía distinguir "no te toca nada" de "esto está roto". Es el
     * estado más frecuente de una cola sana y era el único sin explicación.
     *
     * Se comprueba que el marco se declare ANTES del primer corte por estado, que es lo que
     * hace que los tres caminos lo tengan.
     */
    const iMarco = FUENTE.indexOf('const marco = (');
    const iPrimerCorte = FUENTE.indexOf("if (state.status === 'loading')");
    expect(iMarco).toBeGreaterThan(-1);
    expect(iPrimerCorte).toBeGreaterThan(iMarco);

    /*
     * Y que los CUATRO caminos lo pinten: cargando, error, vacío y la lista.
     *
     * Se cuenta en vez de mirar la vecindad del `return` de vacío. Esa fue la primera versión y
     * NO servía: la ventana de texto alcanzaba el `return` de la lista, que sí trae `{marco}`,
     * así que pasaba con el camino de vacío roto a propósito. Comprobado por mutación.
     */
    const enJsx = FUENTE.split('{marco}').length - 1;
    expect(enJsx).toBe(3); // error, vacío y lista
    expect(FUENTE).toContain('return marco;'); // cargando, sin envoltorio
  });
});
