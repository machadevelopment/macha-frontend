import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, waitFor } from '@testing-library/react';
import { es } from '@/lib/i18n/dictionaries/es';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * EL SCROLL DEL DEEP LINK, MEDIDO — NO AFIRMADO SOBRE LA FUENTE
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * `deep-link.test.ts` comprueba que la PANTALLA contenga `MutationObserver` y `scrollIntoView`,
 * y **pasaba en verde con el scroll roto en producción**: la llamada existía y se disparaba
 * cuando el documento todavía era corto, así que `scrollY` se quedaba en 0. Medido el
 * 2026-09-01 contra `macha.finance`: fila a 152 px y `scrollY: 0`; un segundo después el panel
 * se abría, la fila pasaba a 716 px y quedaban 549 px de scroll que nadie volvía a pedir.
 *
 * Esto mide la conducta: se llama al aparecer la fila Y otra vez cuando crece.
 */
const llamadas: { block?: string }[] = [];

const DOC = 'doc-destacado';

/*
 * Ver la nota de `tarjeta-guiada.test.tsx`: `mock.module` es global al proceso, así que doblar
 * `@/lib/api/browser` le impone esta respuesta a cualquier otro test que monte un componente
 * que llame al backend. Se sustituye `fetch`, que además ejercita el `request` de verdad.
 */
const fetchPrevio = globalThis.fetch;
/* Ver la nota de `tarjeta-guiada.test.tsx`: se pone por test, no una vez al cargar. */
const ponerFetch = () => {
  globalThis.fetch = (async (url: string | URL | Request) => {
    const u = String(typeof url === 'object' && 'url' in url ? url.url : url);
    if (u.includes('/api/documents?')) {
      return Response.json({
        documents: [
          {
            id: DOC,
            filename: 'Concesionaria.xlsx',
            originalFilename: 'Concesionaria.xlsx',
            status: 'promoted',
            createdAt: '2026-08-26T00:00:00.000Z',
            flaggedCount: 0,
          },
        ],
        hasMore: false,
      });
    }
    return Response.json({ conceptos: [] });
  }) as unknown as typeof fetch;
};

const { UploadScreen } = await import('./upload-screen');

/** Doble de `ResizeObserver`: JSDOM no lo trae, y es la pieza que se está midiendo. */
let dispararResize: (() => void) | undefined;
class ResizeObserverFalso {
  constructor(private cb: () => void) {}
  observe() {
    dispararResize = () => this.cb();
  }
  disconnect() {
    dispararResize = undefined;
  }
}

afterEach(() => {
  globalThis.fetch = fetchPrevio;
  cleanup();
});

describe('el scroll del deep link se re-afirma cuando la fila crece', () => {
  test('scrollIntoView se llama al aparecer la fila y OTRA VEZ al abrirse el panel', async () => {
    llamadas.length = 0;
    dispararResize = undefined;
    // @ts-expect-error — doble de test
    globalThis.ResizeObserver = ResizeObserverFalso;

    let alto = 152;
    Element.prototype.getBoundingClientRect = function () {
      return {
        height: alto,
        top: 0,
        bottom: alto,
        left: 0,
        right: 0,
        width: 800,
        x: 0,
        y: 0,
      } as DOMRect;
    };
    Element.prototype.scrollIntoView = function (opciones?: boolean | ScrollIntoViewOptions) {
      llamadas.push(typeof opciones === 'object' ? opciones : {});
    };

    ponerFetch();
    render(
      <UploadScreen
        locale="es"
        labels={es.upload}
        common={es.common}
        canRevert={false}
        destacado={DOC}
      />,
    );

    // Se espera al ANCLA del deep link, no a un texto: es lo que el efecto busca.
    await waitFor(() => {
      expect(document.querySelector(`[data-doc="${DOC}"]`)).not.toBeNull();
    });

    // Primer disparo: la fila existe, pero midiendo 152 px el documento todavía es corto.
    expect(llamadas.length).toBe(1);
    expect(llamadas[0]?.block).toBe('center');

    // El panel de preguntas se abre: la fila crece. Sin re-afirmar, el cliente se queda
    // mirando la lista con la pregunta abajo del pliegue.
    alto = 716;
    const crecer = dispararResize as (() => void) | undefined;
    crecer?.();
    expect(llamadas.length).toBe(2);

    // Deja de crecer → se deja de insistir. Insistir para siempre le arrebataría la pantalla
    // a quien decidió mirar otra cosa.
    crecer?.();
    expect(llamadas.length).toBe(2);
  });
});
