import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * EL ENLACE DIRECTO AL DOCUMENTO (CU-868kyur58)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * El correo dice "Revisar y confirmar" y el cliente hace clic. Lo que pasa después es una
 * cadena de cuatro piezas —página → pantalla → lista → panel— y **cualquiera que se corte deja
 * el flujo en el mismo lugar donde estaba antes**: una lista de cargas donde el cliente tiene
 * que encontrar cuál era la suya.
 *
 * Ninguno de esos cortes falla ni rompe nada: la pantalla se ve perfecta, solo que sin resaltar
 * ni abrir. Por eso se fija cada eslabón por separado.
 */

const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8');
const sinComentarios = (f: string) =>
  f.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const PAGINA = sinComentarios(leer('../../app/(app)/upload/page.tsx'));
const PANTALLA = sinComentarios(leer('./upload-screen.tsx'));
const LISTA = sinComentarios(leer('./document-list.tsx'));
const PANEL = sinComentarios(leer('./conceptos-pendientes.tsx'));
const BANNER = sinComentarios(leer('../dashboard/ingest-status-banner.tsx'));

describe('la cadena del deep link no se corta en ningún eslabón', () => {
  test('1) la PÁGINA lee `?doc=` en el servidor', () => {
    /*
     * En el servidor y no con `useSearchParams`: así el resalte y el panel abierto están en la
     * primera pintura. Leído en el cliente, quien viene del correo vería la lista normal y
     * después un salto — el parpadeo que hace dudar de si el enlace funcionó.
     */
    expect(PAGINA).toContain('searchParams');
    expect(PAGINA).toContain('destacado={destacado}');
  });

  test('2) `?doc=a&doc=b` no rompe la página', () => {
    // Nadie lo escribe a mano; un cliente de correo que reescribe enlaces sí puede duplicar un
    // parámetro, y `Array.isArray` es la diferencia entre resaltar y romper.
    expect(PAGINA).toContain('Array.isArray(doc)');
  });

  test('3) la PANTALLA hace scroll esperando a que la fila exista, y RE-AFIRMA al crecer', () => {
    /*
     * La lista se carga por `fetch` DESPUÉS del primer render, así que al montar no hay a qué
     * hacer scroll. Un `setTimeout` adivinaría cuánto tarda la petición; el observador espera
     * al elemento real.
     *
     * ⚠️ Y esperar a que EXISTA no basta: este test afirmaba solo eso y pasaba en verde con el
     * scroll roto en producción. Con el panel cerrado el documento apenas pasa el alto de la
     * ventana, así que el primer `scrollIntoView` no mueve nada; el panel se abre un segundo
     * después y ahí sí hay a dónde ir. La conducta la mide `deep-link-scroll.test.tsx`, que
     * MONTA la pantalla y hace crecer la fila; acá solo queda fijada la pieza.
     */
    expect(PANTALLA).toContain('MutationObserver');
    expect(PANTALLA).toContain('scrollIntoView');
    expect(PANTALLA).toContain('disconnect()');
    expect(PANTALLA).toContain('ResizeObserver');
  });

  test('4) el scroll respeta `prefers-reduced-motion`', () => {
    expect(PANTALLA).toContain('prefers-reduced-motion');
  });

  test('5) la LISTA marca la fila con `data-doc` y la resalta', () => {
    expect(LISTA).toContain('data-doc={doc.id}');
    expect(LISTA).toContain('doc.id === destacado');
  });

  test('6) el resalte NO cambia el alto de la fila', () => {
    /*
     * `outline` y no `border`: un borde de 2px correría la tabla entera hacia abajo justo
     * cuando el cliente aterriza, y el scroll apuntaría a donde la fila ya no está.
     */
    expect(LISTA).toContain('outline');
    expect(LISTA).not.toMatch(/doc\.id === destacado[\s\S]{0,120}border-2/);
  });

  test('7) el PANEL de preguntas se abre solo para ese documento', () => {
    expect(LISTA).toContain('abrirAlMontar={doc.id === destacado}');
    expect(PANEL).toContain('abrirAlMontar');
  });

  test('8) al abrirse solo, PIDE los conceptos', () => {
    /*
     * El fallo que esto evita es feo y silencioso: `setAbierto(true)` sin `alternar()` deja al
     * cliente que viene del correo mirando un panel abierto y VACÍO. Es `alternar` quien hace
     * la petición.
     */
    expect(PANEL).toMatch(/abrioSolo\.current = true;\s*void alternar\(\);/);
  });

  test('9) se abre UNA vez y no le pelea al usuario que lo cerró', () => {
    expect(PANEL).toContain('abrioSolo');
  });

  test('10) el BANNER del dashboard enlaza al documento cuando hay uno solo', () => {
    /*
     * Con varios en revisión enlaza a la lista sin parámetro, a propósito: resaltar uno cuando
     * hay tres sugiere que los otros dos no necesitan nada. Es la misma decisión que toma el
     * correo consolidado.
     */
    expect(BANNER).toContain('enRevision.length === 1');
    expect(BANNER).toContain('/upload?doc=');
    expect(BANNER).toContain('encodeURIComponent');
    expect(BANNER).toContain('href={destino}');
  });
});
