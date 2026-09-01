import { afterEach, describe, expect, test } from 'bun:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { es } from '@/lib/i18n/dictionaries/es';
import { IngestStatusBanner } from './ingest-status-banner';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * EL BANNER TIENE QUE VER LA PROMOCIÓN PARCIAL (2026-09-01)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Filtraba por `status === 'review'`, y desde la migración `0020` una carga con conceptos
 * pendientes termina en `promoted` con `flagged_count > 0` — el caso NORMAL. A `review` solo
 * llega la que no promovió NADA.
 *
 * Verificado en producción: una carga con 3 conceptos pendientes no aparecía en el banner,
 * mientras el banner anunciaba los 12 de otro documento. Es el MISMO punto ciego que el correo
 * de aviso ya documenta haber corregido (`lib/aviso-de-revision.ts`): estaba aprendido de un
 * lado y sin aplicar del otro, que es cómo el producto termina diciendo dos cosas distintas
 * sobre la misma carga.
 *
 * ⚠️ SE SUSTITUYE `globalThis.fetch`, NO el módulo. `mock.module` es GLOBAL al proceso: mi
 * primera versión doblaba `@/lib/api/browser` y puso en rojo cuatro tests de
 * `aceptar-invitacion.test.tsx`, que no tocan nada de acá. Ese archivo ya documenta el mismo
 * choque y su salida — el panel ejecuta su `request` DE VERDAD, que además es mejor cobertura,
 * y ningún otro archivo se entera. Se restaura en `afterEach` para dejar el proceso como
 * estaba.
 */
const fetchPrevio = globalThis.fetch;

function conDocumentos(documents: unknown[]) {
  globalThis.fetch = (async () => Response.json({ documents })) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = fetchPrevio;
  cleanup();
});

const DOCS = [
  // El caso normal: promovió lo limpio y espera al cliente por 3 conceptos.
  { id: 'doc-parcial', status: 'promoted', flaggedCount: 3 },
  // Una carga limpia: NO tiene que aparecer.
  { id: 'doc-limpio', status: 'promoted', flaggedCount: 0 },
  // Revertida: tampoco.
  { id: 'doc-revertido', status: 'reverted', flaggedCount: 9 },
];

describe('el banner cuenta las cargas que esperan al cliente', () => {
  test('menciona la carga `promoted` con filas marcadas, y sus 3 filas', async () => {
    conDocumentos(DOCS);
    const { container } = render(<IngestStatusBanner labels={es.dashboard.ingest} />);

    await waitFor(() => {
      expect(screen.getByText(es.dashboard.ingest.eyebrow)).toBeDefined();
    });

    const texto = container.textContent ?? '';
    // Una sola carga esperando y tres filas: ni la limpia ni la revertida entran en la cuenta.
    const esperado = es.dashboard.ingest.inReviewWithRows
      .replace('{docs}', '1')
      .replace('{rows}', '3');
    expect(texto).toContain(esperado);
  });

  test('enlaza al documento exacto cuando hay UNO esperando', async () => {
    conDocumentos(DOCS);
    const { container } = render(<IngestStatusBanner labels={es.dashboard.ingest} />);

    const enlace = await waitFor(() => {
      const a = container.querySelector('a[href^="/upload"]') as HTMLAnchorElement | null;
      expect(a).not.toBeNull();
      return a!;
    });
    // Sin esto el cliente aterriza en la lista y tiene que buscar cuál de sus cargas era.
    expect(enlace.getAttribute('href')).toBe('/upload?doc=doc-parcial');
  });

  test('con una carga limpia sola, el banner no existe', async () => {
    conDocumentos([{ id: 'a', status: 'promoted', flaggedCount: 0 }]);
    const { container } = render(<IngestStatusBanner labels={es.dashboard.ingest} />);
    await new Promise((r) => setTimeout(r, 60));
    // Un banner que aparece siempre es uno que nadie lee.
    expect(container.textContent).toBe('');
  });
});
