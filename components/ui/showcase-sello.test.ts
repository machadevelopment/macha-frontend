import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

/**
 * ═══ EL SELLO NO LLEVA EL TILE SALVIA DETRÁS (reporte de Keneth, 2026-08-24) ═══
 *
 * `ShowcaseSeal` era un `InsightPoint` —el cuadrado salvia redondeado— con el isotipo adentro.
 * Y el isotipo trae su propio degradado salvia, así que quedaba **salvia sobre salvia**: el
 * logo se lavaba contra su propio fondo. Keneth lo reportó desde la pantalla de registro: *"le
 * pusieron un cuadro verde alrededor y por eso se ve raro"*.
 *
 * Es un defecto que ningún test de render atrapa —el componente monta, no falla nada— y que
 * solo se ve mirando la pantalla. Por eso se fija sobre el fuente: es la misma clase de
 * comprobación que el proyecto ya usa para el `onError` del callback y para el matcher del
 * middleware.
 *
 * Lo que se afirma es la relación entre las dos piezas, no una clase de Tailwind: el sello
 * puede cambiar de tamaño o de espaciado sin romper esto, y solo falla si alguien vuelve a
 * meter el isotipo dentro del Insight Point.
 */
const fuente = readFileSync(new URL('./showcase.tsx', import.meta.url), 'utf8');

/**
 * El cuerpo de una función exportada, sin comentarios: lo que de verdad se renderiza.
 *
 * El corte busca `\n}\n` —una llave sola en su línea— y no `\n}`: lo segundo casa con el
 * `}: {` de la firma de un componente con props, así que devolvía la firma vacía y el test
 * pasaba sin haber mirado nada. Me pasó escribiéndolo.
 */
function cuerpoDe(nombre: string): string {
  const desde = fuente.indexOf(`export function ${nombre}`);
  expect(desde).toBeGreaterThan(-1);
  const hasta = fuente.indexOf('\n}\n', desde);
  expect(hasta).toBeGreaterThan(desde);
  return fuente
    .slice(desde, hasta)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

describe('el sello de vitrina', () => {
  test('no envuelve el isotipo en un Insight Point', () => {
    expect(cuerpoDe('ShowcaseSeal')).not.toContain('InsightPoint');
  });

  test('sigue mostrando el isotipo — no se borró la firma', () => {
    // Quitar el fondo no era quitar el sello: sin él, el eyebrow queda flotando y la columna
    // centrada se queda sin nada que la ancle.
    expect(cuerpoDe('ShowcaseSeal')).toContain('MachaMark');
  });

  test('el fondo ambient del marco NO se toca', () => {
    /*
     * `ShowcaseFrame` sí usa Insight Point, y debe seguir usándolo: ahí el salvia es una mancha
     * de fondo detrás de toda la pantalla, no un cuadrado pegado al logo. El reporte era sobre
     * el sello, y confundir las dos piezas apagaría el acento de marca de las vitrinas.
     */
    expect(cuerpoDe('ShowcaseFrame')).toContain('InsightPoint');
  });
});
