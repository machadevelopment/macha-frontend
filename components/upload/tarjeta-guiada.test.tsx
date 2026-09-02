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

/*
 * ⚠️ SE SUSTITUYE `globalThis.fetch`, NO EL MÓDULO. `mock.module` es global al proceso: este
 * archivo doblaba `@/lib/api/browser` y con eso le imponía SU respuesta a cualquier otro test
 * que montara un componente que llama al backend — puso en rojo cuatro tests del portón, que no
 * tocan nada de acá. El componente ejecuta su `request` de verdad, que además es mejor
 * cobertura, y ningún otro archivo se entera. Es el mismo patrón que ya usan
 * `aceptar-invitacion.test.tsx` y `browser.test.ts`.
 */
const fetchPrevio = globalThis.fetch;
/*
 * ⚠️ Se pone en `beforeEach` y NO una vez al cargar el módulo: el `afterEach` lo restaura, así
 * que asignándolo una sola vez solo el PRIMER test del archivo tendría el doble y los demás
 * llamarían al fetch que dejó otro archivo. Es un modo de fallo que solo aparece con la suite
 * entera, nunca corriendo este archivo solo.
 */
const ponerFetch = (conceptos: unknown[] = CONCEPTOS) => {
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(typeof url === 'object' && 'url' in url ? url.url : url);
    pedidos.push({ url: u, init });
    if (u.includes('conceptos-pendientes')) return Response.json({ conceptos });
    return Response.json({ filasResueltas: 6 });
  }) as unknown as typeof fetch;
};

const { ConceptosPendientes } = await import('./conceptos-pendientes');

const labels = es.upload.conceptos;

/**
 * @param conceptos Conceptos propios de un test. Por defecto los dos del archivo, para no tocar
 *   los tests que ya existían — sus casos dependen de que haya exactamente dos.
 */
function montar(conceptos: unknown[] = CONCEPTOS) {
  pedidos.length = 0;
  ponerFetch(conceptos);
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

afterEach(() => {
  globalThis.fetch = fetchPrevio;
  cleanup();
});

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

describe('el botón principal exige el rubro DEL concepto en pantalla', () => {
  test('sigue deshabilitado en el segundo concepto aunque el primero ya esté contestado', async () => {
    montar();
    await abierto();

    const principal = () => screen.getByRole('button', { name: /Guardar/ });

    // Primer concepto: sin rubro está apagado, con rubro se enciende.
    expect((principal() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(labels.categoryLabel), {
      target: { value: 'transporte' },
    });
    expect((principal() as HTMLButtonElement).disabled).toBe(false);

    // Avanzar al segundo. El campo vuelve vacío, así que el botón tiene que volver a apagarse:
    // antes miraba las respuestas ACUMULADAS y quedaba encendido, y apretarlo dejaba este
    // concepto sin contestar diciendo "Guardar y seguir".
    fireEvent.click(principal());
    await screen.findByText('Pago Vecinos SA');

    expect((screen.getByLabelText(labels.categoryLabel) as HTMLInputElement).value).toBe('');
    expect((principal() as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('siempre se puede volver al concepto anterior', () => {
  /*
   * Pedido de Keneth (2026-09-01): *"botones de regresar por si presiono eso por accidente y no
   * estaba seguro"*. Avanzar era irreversible, y el botón de avanzar está pegado al de omitir:
   * equivocarse costaba un clic y no había vuelta.
   */
  test('no se ofrece en el PRIMER concepto: no hay a dónde volver', async () => {
    montar();
    await abierto();
    // Un botón que no hace nada enseña a desconfiar de los que sí.
    expect(screen.queryByRole('button', { name: labels.atras })).toBeNull();
  });

  test('vuelve al anterior Y conserva lo que ya se había contestado', async () => {
    montar();
    await abierto();

    fireEvent.change(screen.getByLabelText(labels.categoryLabel), {
      target: { value: 'transporte' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));
    await screen.findByText('Pago Vecinos SA');

    fireEvent.click(screen.getByRole('button', { name: labels.atras }));
    await screen.findByText('Flete Cropa');

    /*
     * Y el rubro sigue escrito. Es la misma garantía que hace que avanzar no borre lo
     * anterior: las respuestas viven indexadas por concepto, no en el formulario. Si volver
     * las perdiera, el botón de regresar seria una trampa peor que no tenerlo.
     */
    expect((screen.getByLabelText(labels.categoryLabel) as HTMLInputElement).value).toBe(
      'transporte',
    );
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * LA TARJETA DICE SI EL CONCEPTO ES UNA CUENTA POR COBRAR O PAGAR (reporte de Jose, 2026-09-01)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * *"Si ponemos solo los del dashboard y el campo va a cuentas por pagar, no lo estamos
 * registrando."*
 *
 * Las cuatro opciones que el cliente contesta son los `type` del ESTADO DE RESULTADOS. El
 * backend manda `entity` desde el principio y **este componente no lo leía**, así que una fila
 * que es una CUENTA POR PAGAR se presentaba igual que una venta de mostrador: el cliente
 * contestaba "es un costo" sin que nada le dijera que además le debe a alguien y que ese
 * concepto va a salir en Por pagar.
 */
describe('la tarjeta dice dónde vive el concepto', () => {
  const conEntidad = (entity: 'transaction' | 'invoice' | 'bill') => [
    {
      concepto: 'cropa',
      ejemplo: 'Cropa',
      filas: 4,
      montos: [{ currency: 'GTQ', total: 15973.2 }],
      entity,
    },
  ];
  /** `entity` es lo único que cambia entre los casos, así que se espera por el nombre común. */
  const listo = () => screen.findByText('Cropa');

  test('una CUENTA POR PAGAR lo dice, y dice dónde corregirlo', async () => {
    montar(conEntidad('bill'));
    await listo();
    /*
     * Texto LITERAL y no `new RegExp(...)`: los textos llevan `¿?` y `«»`, y el `?` en un regex
     * hace opcional el carácter anterior — el patrón deja de coincidir con lo que se pintó.
     * `exact: false` porque el aviso comparte el `<p>` con la frase de dónde corregirlo.
     */
    expect(screen.getByText(labels.vive.bill, { exact: false })).toBeTruthy();
    /*
     * Y nombra dónde ir: el cambio es por HOJA porque exige releer el archivo. Sin esta parte,
     * la pantalla informa un problema y no dice qué hacer con él.
     */
    expect(screen.getByText(labels.vive.siEstaMal)).toBeTruthy();
  });

  test('una CUENTA POR COBRAR lo dice con su propio texto', async () => {
    montar(conEntidad('invoice'));
    await listo();
    expect(screen.getByText(labels.vive.invoice, { exact: false })).toBeTruthy();
  });

  test('un movimiento normal NO lleva el aviso', async () => {
    /*
     * Es el caso común: pintarlo siempre convertiría la señal en cromo y el cliente dejaría de
     * leerla justo cuando importa.
     */
    montar(conEntidad('transaction'));
    await listo();
    expect(screen.queryByText(labels.vive.bill, { exact: false })).toBeNull();
    expect(screen.queryByText(labels.vive.invoice, { exact: false })).toBeNull();
    /*
     * ⚠️ Y sobre todo el bloque NO se pinta. Afirmarlo con `siEstaMal` y no con los otros dos
     * textos es lo que hace que el test sirva: esa frase no depende de la entidad, así que si
     * la condición se rompiera y el bloque se pintara siempre, aparecería. Con los otros dos
     * la mutación pasaba en VERDE, porque `labels.vive['transaction']` es `undefined` y no
     * pinta nada — el test medía la ausencia de un texto que nunca podía existir.
     */
    expect(screen.queryByText(labels.vive.siEstaMal)).toBeNull();
  });
});
