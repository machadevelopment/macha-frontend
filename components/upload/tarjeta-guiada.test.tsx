import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { es } from '@/lib/i18n/dictionaries/es';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * LA TARJETA GUIADA, RENDERIZADA DE VERDAD Y CONTRA EL MOCKUP APROBADO (CU-868kyur58)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * `conceptos-pendientes.test.ts` mira la FUENTE (que los textos salgan del diccionario, que el
 * POST siga siendo uno). Esto monta el componente y comprueba lo que el cliente ve y hace,
 * que es lo único que el ticket promete:
 *
 *   · una pregunta a la vez, no todas apiladas;
 *   · las respuestas de los conceptos anteriores NO se pierden al avanzar;
 *   · omitir el último guarda lo contestado en vez de tirarlo.
 *
 * Los tres son invisibles en la fuente y caros en producción: perder tres respuestas al llegar
 * a la cuarta pregunta es trabajo que el dueño ya hizo y que el producto descarta.
 */

/** Lo que el cliente pidió y lo que se mandó, para poder afirmar la ÚNICA llamada del POST. */
const pedidos: { url: string; init?: RequestInit }[] = [];

const CONCEPTOS = [
  {
    concepto: 'cropa|flete',
    ejemplo: 'Flete Cropa',
    filas: 4,
    montos: [{ currency: 'GTQ', total: 12_400 }],
  },
  {
    concepto: 'sa|vecinos',
    ejemplo: 'Pago Vecinos SA',
    filas: 2,
    montos: [{ currency: 'GTQ', total: 3_100 }],
  },
];

mock.module('@/lib/api/browser', () => ({
  request: async (url: string, init?: RequestInit) => {
    pedidos.push({ url, init });
    if (url.includes('conceptos-pendientes')) {
      return { ok: true, data: { conceptos: CONCEPTOS } };
    }
    return { ok: true, data: { filasResueltas: 6 } };
  },
  requestJson: async () => ({ ok: true, data: {} }),
  errorMessage: () => '',
}));

const { ConceptosPendientes } = await import('./conceptos-pendientes');

const labels = es.upload.conceptos;

function montar() {
  pedidos.length = 0;
  return render(
    <ConceptosPendientes
      documentId="doc-1"
      labels={labels}
      common={es.common}
      locale="es"
      abrirAlMontar
    />,
  );
}

/** Espera a que el panel termine de pedir sus conceptos. */
const abierto = () => screen.findByText('Flete Cropa');

afterEach(cleanup);

describe('la tarjeta pregunta un concepto a la vez', () => {
  test('muestra SOLO el primer concepto, no los dos', async () => {
    montar();
    await abierto();

    expect(screen.getByText('Flete Cropa')).toBeDefined();
    // El segundo existe únicamente dentro del botón ("Guardar y seguir → «Pago Vecinos SA»"),
    // que es justamente cómo el archivo lo anuncia: nombrado, no contestable todavía.
    expect(screen.queryByText('Pago Vecinos SA')).toBeNull();
    expect(screen.getByRole('button', { name: /Pago Vecinos SA/ })).toBeDefined();
  });

  test('las cuatro opciones son radios y una está elegida', async () => {
    montar();
    await abierto();

    const opciones = screen.getAllByRole('radio');
    expect(opciones).toHaveLength(4);
    // `opex` es el default del componente, y el archivo lo muestra seleccionado.
    expect(opciones.filter((o) => o.getAttribute('aria-checked') === 'true')).toHaveLength(1);
    expect(screen.getByText(labels.type.opex)).toBeDefined();
    expect(screen.getByText(labels.typeHint.opex)).toBeDefined();
  });

  test('el progreso se anuncia con texto, no solo con puntos', async () => {
    montar();
    await abierto();
    expect(screen.getByText('Concepto 1 de 2')).toBeDefined();
  });

  test('el monto va junto al concepto, en su moneda', async () => {
    montar();
    await abierto();
    // El formato lo pone `formatMoney`; lo que se afirma es que la cifra viaja y no se pierde.
    expect(screen.getByText(/4 filas ·/)).toBeDefined();
  });
});

describe('avanzar NO pierde lo ya contestado', () => {
  test('la respuesta del primer concepto sobrevive al llegar al segundo', async () => {
    montar();
    await abierto();

    // Contesta el primero: elige "un ingreso" y escribe su rubro.
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(labels.type.revenue) }));
    fireEvent.change(screen.getByLabelText(labels.categoryLabel), {
      target: { value: 'transporte' },
    });

    // Avanza al segundo.
    fireEvent.click(screen.getByRole('button', { name: /Pago Vecinos SA/ }));
    expect(await screen.findByText('Pago Vecinos SA')).toBeDefined();
    expect(screen.getByText('Concepto 2 de 2')).toBeDefined();

    // Contesta el segundo y guarda: el POST tiene que llevar LOS DOS.
    fireEvent.change(screen.getByLabelText(labels.categoryLabel), {
      target: { value: 'servicios' },
    });
    fireEvent.click(screen.getByRole('button', { name: labels.submitLast }));

    await new Promise((r) => setTimeout(r, 0));

    const post = pedidos.find((p) => p.init?.method === 'POST');
    expect(post).toBeDefined();
    const cuerpo = JSON.parse(String(post!.init!.body)) as {
      respuestas: { concepto: string; type: string; category: string }[];
    };

    /*
     * DOS respuestas en UNA llamada. Es la garantía que el rediseño podía romper sin que nada
     * fallara: un POST por concepto daría cuatro promociones encoladas y un dashboard que se
     * mueve a pedazos, y peor —si el estado se reiniciara al avanzar— se perdería la primera.
     */
    expect(cuerpo.respuestas).toHaveLength(2);
    expect(cuerpo.respuestas.map((r) => r.category).sort()).toEqual(['servicios', 'transporte']);
    expect(cuerpo.respuestas.find((r) => r.concepto === 'cropa|flete')?.type).toBe('revenue');
    expect(pedidos.filter((p) => p.init?.method === 'POST')).toHaveLength(1);
  });
});

describe('omitir', () => {
  test('en el último concepto GUARDA lo contestado en vez de descartarlo', async () => {
    montar();
    await abierto();

    // Contesta el primero y avanza.
    fireEvent.change(screen.getByLabelText(labels.categoryLabel), {
      target: { value: 'transporte' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Pago Vecinos SA/ }));
    await screen.findByText('Pago Vecinos SA');

    // Y en el último elige omitir SIN contestarlo.
    fireEvent.click(screen.getByRole('button', { name: labels.skip }));
    await new Promise((r) => setTimeout(r, 0));

    const post = pedidos.find((p) => p.init?.method === 'POST');
    expect(post).toBeDefined();
    const cuerpo = JSON.parse(String(post!.init!.body)) as { respuestas: unknown[] };
    // La respuesta del primero se guarda; la del omitido no se inventa.
    expect(cuerpo.respuestas).toHaveLength(1);
  });

  test('sin ninguna respuesta, omitir el último simplemente cierra', async () => {
    montar();
    await abierto();

    /*
     * ⚠️ Se avanza con OMITIR y no con el botón principal, y eso ES el comportamiento: sin
     * rubro escrito el primario está deshabilitado, así que "omitir" es el único camino para
     * pasar de largo una pregunta. Mi primera versión de este test clicaba el primario y se
     * quedaba en el concepto 1 sin decir por qué — el test estaba mal, no el componente.
     */
    fireEvent.click(screen.getByRole('button', { name: labels.skip }));
    expect(await screen.findByText('Pago Vecinos SA')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: labels.skip }));
    await new Promise((r) => setTimeout(r, 0));

    // Nada que guardar: no se manda un POST vacío que encolaría una promoción sin trabajo.
    expect(pedidos.filter((p) => p.init?.method === 'POST')).toHaveLength(0);
    // Y el panel se cierra: quedarse en la última pregunta tras omitirla no ofrece salida.
    expect(screen.queryByText('Pago Vecinos SA')).toBeNull();
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * LO QUE SOLO SE VE EN UN NAVEGADOR (verificación E2E contra producción, 2026-09-01)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Los dos defectos de abajo pasaron toda la suite anterior y los encontró abrir la página en
 * Chrome. Se fijan acá para que no vuelvan por donde no se mira.
 */
describe('defectos encontrados abriendo la pantalla de verdad', () => {
  test('el disparador cerrado NO afirma "0 conceptos"', () => {
    // Sin `abrirAlMontar`, `conceptos` todavía es `undefined`: la lista se pide AL abrir.
    // Antes decía "Ayúdanos a clasificar 0 concepto(s)" — el producto le decía al cliente que
    // no hay nada que contestar en el único control que existe para que conteste.
    render(
      <ConceptosPendientes documentId="doc-1" labels={labels} common={es.common} locale="es" />,
    );

    expect(screen.getByRole('button', { name: labels.ctaSinConteo })).toBeDefined();
    expect(screen.queryByText(/0 concepto/)).toBeNull();
  });

  test('el panel expandido de la lista recupera el ajuste de línea de la celda', async () => {
    // La celda lleva `whitespace-nowrap` para que el nombre del archivo no se parta, y eso se
    // heredaba a toda la prosa del panel: la tabla se ensanchaba 114 px sobre su contenedor y
    // la pregunta quedaba cortada por la derecha. Ningún render de ESTE componente lo ve —
    // la regla vive en `document-list` —, así que se afirma sobre su fuente.
    const fuente = await Bun.file(new URL('./document-list.tsx', import.meta.url).pathname).text();
    const panel = fuente.replace(/\s+/g, ' ');

    expect(panel).toContain('mt-1.5 flex flex-col gap-1.5 whitespace-normal');
  });
});
