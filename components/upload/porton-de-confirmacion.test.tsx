import { afterEach, describe, expect, test } from 'bun:test';
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { es } from '@/lib/i18n/dictionaries/es';
import { ConfirmacionDeCarga } from './confirmacion-de-carga';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * EL PORTÓN, RENDERIZADO: "ESTO ENTENDIMOS DE TU ARCHIVO" (migración 0042)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Lo que esta pantalla tiene que lograr, y que ningún test de fuente puede ver:
 *
 *  1. Que el cliente VEA el dinero de cada hoja. Los siete fallos de ingesta de esta semana
 *     fueron decisiones sobre hojas tomadas con alta confianza y equivocadas; el monto al lado
 *     del nombre es lo único que le permite desmentirnos de un vistazo.
 *  2. Que vea también lo que NO usamos, con su motivo y su dinero. Una hoja perdida en silencio
 *     es el fallo más caro de esta casa, y es invisible si la pantalla solo muestra lo que sí
 *     entró.
 *  3. Que publicar de verdad publique. Si el portón no se abre, el cliente se queda sin su
 *     contabilidad y sin saber por qué — el desenlace que dejó 0 filas en producción antes de
 *     la migración 0020.
 *
 * ⚠️ Se sustituye `globalThis.fetch` y NO se dobla `@/lib/api/browser`: `mock.module` es global
 * al proceso y ya puso en rojo tests de otros archivos en esta misma sesión.
 */
const fetchPrevio = globalThis.fetch;

const RESUMEN = {
  documentId: 'doc-1',
  status: 'awaiting_confirmation',
  confirmedAt: null,
  filas: 42,
  marcadas: 0,
  hojas: [
    { nombre: 'Ventas', estado: 'movimientos', filas: 8, montos: [{ moneda: 'GTQ', total: 13196, filas: 8 }] },
    { nombre: 'Resumen_Ventas', estado: 'descartada', motivo: 'duplica_otra_hoja', filas: 4, montos: [{ moneda: 'GTQ', total: 13196, filas: 4 }] },
    { nombre: 'Inventario', estado: 'inventario' },
  ],
}; // prettier-ignore

/** Lo que el cliente mandó al publicar, para poder afirmar las hojas excluidas. */
let publicado: { excluir?: string[] } | null = null;

function conBackend() {
  publicado = null;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(typeof url === 'object' && 'url' in url ? url.url : url);
    if (u.includes('/confirmar')) {
      publicado = JSON.parse(String(init?.body ?? '{}')) as { excluir?: string[] };
      return Response.json({ confirmado: true, yaEstaba: false, hojasExcluidas: 0 });
    }
    return Response.json(RESUMEN);
  }) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = fetchPrevio;
  cleanup();
});

const pintar = () =>
  render(
    <ConfirmacionDeCarga
      documentId="doc-1"
      labels={es.upload.confirmacion}
      reasonLabels={es.upload.readSummary.reason}
      conceptosLabels={es.upload.conceptos}
      common={es.common}
      locale="es"
    />,
  );

describe('el cliente ve qué hicimos con cada hoja, con su dinero', () => {
  test('la hoja usada muestra sus movimientos y su monto', async () => {
    conBackend();
    const { container } = pintar();
    await waitFor(() => expect(screen.getByText('Ventas')).toBeDefined());
    // Sin la cifra al lado, la lista dice "confiá en nosotros" en vez de dejarse desmentir.
    expect(container.textContent).toContain('8 movimientos');
    expect(container.textContent).toContain('13,196');
  });

  test('⚠️ la hoja DESCARTADA aparece, con su motivo y el dinero que se quedó afuera', async () => {
    conBackend();
    const { container } = pintar();
    await waitFor(() => expect(screen.getByText('Resumen_Ventas')).toBeDefined());
    // Una hoja perdida en silencio es el fallo más caro; mostrarla es lo que lo vuelve visible.
    expect(container.textContent).toContain(es.upload.confirmacion.noUsada);
    expect(container.textContent).toContain('repite el mismo dinero');
  });
});

describe('publicar abre el portón', () => {
  test('el botón manda la confirmación y avisa que ya está', async () => {
    conBackend();
    pintar();
    const boton = await waitFor(() =>
      screen.getByRole('button', { name: es.upload.confirmacion.publicar }),
    );
    fireEvent.click(boton);
    await waitFor(() => expect(screen.getByText(es.upload.confirmacion.publicado)).toBeDefined());
    expect(publicado).not.toBeNull();
  });

  test('desconocer una hoja la manda en `excluir`', async () => {
    conBackend();
    pintar();
    await waitFor(() => expect(screen.getByText('Ventas')).toBeDefined());

    // "Esta no debería contar" solo se ofrece sobre una hoja que SÍ estamos usando: sobre una
    // ya descartada sería un control que no hace nada.
    const excluir = screen.getAllByRole('button', { name: es.upload.confirmacion.excluir });
    expect(excluir).toHaveLength(1);
    fireEvent.click(excluir[0]!);

    fireEvent.click(screen.getByRole('button', { name: es.upload.confirmacion.publicar }));
    await waitFor(() => expect(publicado).not.toBeNull());
    expect(publicado!.excluir).toEqual(['Ventas']);
  });
});

describe('una carga ya confirmada no vuelve a pedir nada', () => {
  test('no pinta el portón', async () => {
    globalThis.fetch = (async () =>
      Response.json({ ...RESUMEN, confirmedAt: '2026-09-01T10:00:00.000Z' })) as never;
    const { container } = pintar();
    await new Promise((r) => setTimeout(r, 60));
    // Volver a pedir un visto bueno ya dado es la forma de que se apriete sin mirar.
    expect(container.textContent).toBe('');
  });
});
