import { describe, expect, test } from 'bun:test';
import { getDictionary } from '@/lib/i18n/get-dictionary';

/**
 * CU-868krw2wn — un reporte que no se completó NO se muestra como completo.
 *
 * La fila de `reports` se crea antes de generar la narrativa, así que una generación fallida
 * deja una fila sin contenido. Hasta este ticket la lista la pintaba idéntica a una buena —
 * mismo enlace, mismo aspecto— y al hacer clic el detalle respondía "no encontrado", que es
 * falso: el reporte existe, lo que no existe es su contenido.
 *
 * Lo que se fija acá es la DECISIÓN, no el DOM: cuándo una fila es navegable y qué chip le
 * toca. Se prueba sobre la misma expresión que usa el componente (`ready !== false`) porque
 * es donde estaba el bug — y en particular el caso `undefined`, que es el que decide si el
 * histórico ya generado sigue siendo navegable después del despliegue.
 */

/** La regla del componente, en una línea, tal como la evalúa al pintar cada fila. */
const esNavegable = (ready?: boolean) => ready !== false;

/**
 * La derivación de estado del componente — CU-868ktkuq0.
 *
 * `ready` solo tenía dos salidas y su ausencia significaba dos cosas: "todavía se está
 * generando" y "ya no se va a generar". La lista elegía FALLÓ para ese caso, así que todo
 * reporte recién pedido salía en rojo — y como la fila se crea ANTES de encolar el job, ese
 * es el estado normal de cualquier reporte, no el excepcional.
 */
const estadoDeFila = (r: { ready?: boolean; status?: 'ready' | 'generating' | 'failed' }) =>
  r.status ?? (r.ready !== false ? 'ready' : 'failed');

describe('estado de una fila de reporte', () => {
  test('un reporte con versión es navegable', () => {
    expect(esNavegable(true)).toBe(true);
  });

  test('un reporte SIN versión no es navegable', () => {
    // El caso reportado. Antes esta fila llevaba enlace y el clic terminaba en un error.
    expect(esNavegable(false)).toBe(false);
  });

  test('sin el campo se asume listo, para no romper el histórico', () => {
    /*
     * Importa más de lo que parece: si `ready` ausente se leyera como "no listo", el primer
     * render contra un backend que todavía no despliega el campo dejaría TODOS los reportes
     * de la empresa sin enlace. El defecto se elige del lado de seguir funcionando.
     */
    expect(esNavegable(undefined)).toBe(true);
  });
});

describe('los tres estados de un reporte (CU-868ktkuq0)', () => {
  test('el backend nuevo manda el estado y se usa tal cual', () => {
    expect(estadoDeFila({ status: 'generating' })).toBe('generating');
    expect(estadoDeFila({ status: 'failed' })).toBe('failed');
    expect(estadoDeFila({ status: 'ready' })).toBe('ready');
  });

  test('generándose NO es fallido — es el caso que se estaba pintando en rojo', () => {
    // El bug entero, en una línea: `ready: false` con `status: 'generating'` tiene que
    // leerse como generándose. Antes solo existía el booleano y decía "falló".
    expect(estadoDeFila({ ready: false, status: 'generating' })).toBe('generating');
  });

  test('sin `status` se cae al booleano de siempre, no a "generándose"', () => {
    /*
     * La ventana de despliegue en que el frontend va adelante del backend. Suponer
     * "generándose" ahí dejaría un reporte que de verdad falló mostrándose como si
     * estuviera por llegar, para siempre. Sin dato, se conserva el comportamiento conocido.
     */
    expect(estadoDeFila({ ready: false })).toBe('failed');
    expect(estadoDeFila({ ready: true })).toBe('ready');
    expect(estadoDeFila({})).toBe('ready');
  });
});

describe('textos de estado', () => {
  // Paridad ES/EN la cubre `lib/i18n/parity.test.ts` sobre el diccionario entero; acá lo que
  // se comprueba es que las claves que el componente usa existan y digan algo — una clave
  // faltante rendería `undefined` en la celda sin que nada más se rompa.
  for (const locale of ['es', 'en'] as const) {
    test(`${locale}: la lista tiene columna de estado y sus dos rótulos`, () => {
      const d = getDictionary(locale).reports;

      expect(d.table.status.length).toBeGreaterThan(0);
      expect(d.status.ready.length).toBeGreaterThan(0);
      expect(d.status.notGenerated.length).toBeGreaterThan(0);
      // La pista dice qué HACER, así que no puede ser una sola palabra.
      expect(d.status.notGeneratedHint.split(' ').length).toBeGreaterThan(2);

      // CU-868ktkuq0: el tercer estado, con su propia pista. Reusar `notGeneratedHint`
      // ("vuelve a generarlo") sobre un reporte que SÍ viene en camino mandaría al usuario
      // a gastar créditos por gusto.
      expect(d.status.generating.length).toBeGreaterThan(0);
      expect(d.status.generatingHint.split(' ').length).toBeGreaterThan(2);
    });
  }
});
