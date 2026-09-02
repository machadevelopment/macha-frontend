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
    {
      nombre: 'Ventas',
      estado: 'movimientos',
      filas: 8,
      montos: [{ moneda: 'GTQ', total: 13196, filas: 8 }],
      columnas: { fecha: 'Fecha', monto: 'Total Línea', 'cliente o proveedor': 'Cliente' },
    },
    { nombre: 'Resumen_Ventas', estado: 'descartada', motivo: 'duplica_otra_hoja', filas: 4, montos: [{ moneda: 'GTQ', total: 13196, filas: 4 }] },
    { nombre: 'Inventario', estado: 'inventario' },
  ],
  detalle: {
    Ventas: {
      tipos: { revenue: 8 },
      destinos: ['ingresos', 'porCobrar', 'productos'],
      muestra: [
        { fecha: '2026-01-08', concepto: 'Cliente 1', monto: 1240.5, moneda: 'GTQ', tipo: 'revenue', categoria: 'ventas' },
        { fecha: '2026-02-15', concepto: 'Cliente 2', monto: 980, moneda: 'GTQ', tipo: 'revenue', categoria: 'ventas' },
      ],
    },
  },
}; // prettier-ignore

/** Lo que el cliente mandó al publicar, para poder afirmar las hojas excluidas. */
let publicado: { excluir?: string[]; reclasificar?: { hoja: string; type: string }[] } | null =
  null;

function conBackend() {
  publicado = null;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(typeof url === 'object' && 'url' in url ? url.url : url);
    if (u.includes('/confirmar')) {
      publicado = JSON.parse(String(init?.body ?? '{}')) as typeof publicado;
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
    /*
     * Publicar es el clic caro y pasa por un "¿seguro?" que dice QUÉ va a pasar. Un paso que no
     * dice nada nuevo solo agregaría un clic; este nombra cuántas hojas entran.
     */
    await waitFor(() =>
      expect(screen.getByText(es.upload.confirmacion.confirmarTitulo)).toBeDefined(),
    );
    expect(publicado).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: es.upload.confirmacion.confirmarSi }));
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
    fireEvent.click(
      await waitFor(() => screen.getByRole('button', { name: es.upload.confirmacion.confirmarSi })),
    );
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

describe('siempre se puede volver atrás', () => {
  /*
   * Pedido de Keneth (2026-09-01): *"botones de regresar por si presiono eso por accidente y no
   * estaba seguro"*. Lo que se protege es el clic caro — publicar — y la exclusión de una hoja,
   * que son las dos decisiones de esta pantalla.
   */
  test('el "¿seguro?" tiene salida y NO publica al volver', async () => {
    conBackend();
    pintar();
    fireEvent.click(
      await waitFor(() => screen.getByRole('button', { name: es.upload.confirmacion.publicar })),
    );
    fireEvent.click(screen.getByRole('button', { name: es.upload.confirmacion.volver }));

    // Se vuelve al estado anterior y no se mandó nada.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: es.upload.confirmacion.publicar })).toBeDefined(),
    );
    expect(publicado).toBeNull();
  });

  test('desconocer una hoja se puede DESHACER', async () => {
    conBackend();
    pintar();
    await waitFor(() => expect(screen.getByText('Ventas')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: es.upload.confirmacion.excluir }));
    // El control cambia de sentido: la misma hoja ahora ofrece volver a incluirla.
    const deshacer = await waitFor(() =>
      screen.getByRole('button', { name: es.upload.confirmacion.deshacer }),
    );
    fireEvent.click(deshacer);

    fireEvent.click(screen.getByRole('button', { name: es.upload.confirmacion.publicar }));
    fireEvent.click(
      await waitFor(() => screen.getByRole('button', { name: es.upload.confirmacion.confirmarSi })),
    );
    await waitFor(() => expect(publicado).not.toBeNull());
    // Si el deshacer no funcionara, `Ventas` viajaría excluida y su dinero no entraría.
    expect(publicado!.excluir).toEqual([]);
  });
});

describe('cada hoja se puede abrir para ver qué entendimos', () => {
  /*
   * Pedido de Keneth (2026-09-01). Aprobar un nombre y un total alcanza para detectar una hoja
   * de más o de menos —que es lo que atrapó los siete fallos de esta semana— pero NO alcanza
   * para el que queda: leer la columna equivocada, donde el total se ve perfecto y cada fila
   * está mal.
   */
  test('el panel dice de DÓNDE salió cada dato y muestra filas reales', async () => {
    conBackend();
    pintar();
    fireEvent.click(
      await waitFor(() => screen.getByRole('button', { name: es.upload.confirmacion.verDetalle })),
    );

    const texto = document.body.textContent ?? '';
    // El mapa de columnas: es lo único que delata un encabezado corrido.
    expect(texto).toContain('Total Línea');
    // Y filas reales, para reconocerlas contra el archivo que el dueño tiene al lado.
    expect(texto).toContain('Cliente 1');
    expect(texto).toContain('1,240.50');
  });

  test('"esto es otra cosa" corrige la hoja ENTERA y viaja en la confirmación', async () => {
    conBackend();
    pintar();
    fireEvent.click(
      await waitFor(() => screen.getByRole('button', { name: es.upload.confirmacion.verDetalle })),
    );

    /*
     * Las cuatro naturalezas son radios de verdad, no divs clicables. Se cuentan DENTRO de su
     * propio grupo y no en toda la pantalla: el panel tiene además la pregunta de "¿dónde se
     * registra?" con sus tres opciones, y un conteo global se rompería con cada pregunta nueva
     * sin decir nada sobre la que se quiere probar.
     */
    const grupoTipo = screen.getByRole('radiogroup', { name: es.upload.confirmacion.corregir });
    expect(grupoTipo.querySelectorAll('[role="radio"]').length).toBe(4);
    fireEvent.click(screen.getByRole('radio', { name: es.upload.conceptos.type.opex }));

    fireEvent.click(screen.getByRole('button', { name: es.upload.confirmacion.publicar }));
    fireEvent.click(
      await waitFor(() => screen.getByRole('button', { name: es.upload.confirmacion.confirmarSi })),
    );
    await waitFor(() => expect(publicado).not.toBeNull());

    /*
     * Si esto no viajara, el cliente vería su corrección aplicada en pantalla y su dashboard
     * saldría igual que antes — la forma exacta de fallo que esta pantalla existe para
     * eliminar.
     */
    expect(publicado!.reclasificar).toEqual([{ hoja: 'Ventas', type: 'opex' }]);
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * LAS DOS SALIDAS QUE FALTABAN (migración 0043, 2026-09-01)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * El portón le ENSEÑA al dueño las dos cosas que más caro cuestan de esta ingesta —una hoja
 * descartada por error y un dato leído de la columna equivocada— y no le daba salida para
 * ninguna: las veía y no podía hacer nada. Lo que se mide acá es la CONDUCTA, no la fuente:
 *
 *  · que apretar mande la corrección al endpoint con la forma que el backend espera —un
 *    `forzar` que llegue como otra cosa es un 200 que no arregla nada—;
 *  · que el picker de columna mande el ÍNDICE de la columna elegida, porque `sheet_overrides`
 *    se indexa por posición y un nombre no lo puede consumir nadie;
 *  · y que una portada no se liste como si hubiéramos descartado contabilidad.
 */

/** El mismo libro, más una portada sin dinero y con los encabezados de la hoja de ventas. */
const RESUMEN_0043 = {
  ...RESUMEN,
  marcadas: 30,
  hojas: [
    {
      ...RESUMEN.hojas[0],
      encabezados: ['Fecha', 'Cliente', 'Precio Unitario', 'Total Línea'],
    },
    RESUMEN.hojas[1],
    RESUMEN.hojas[2],
    // Sin un solo monto medido: es una carátula, no un descarte que haya que defender.
    { nombre: 'Portada', estado: 'descartada', motivo: 'vacia', filas: 2, montos: [] },
    { nombre: 'Notas', estado: 'descartada', motivo: 'vacia', filas: 3 },
    // Una hoja que SÍ produjo filas pero ningún monto: la carátula que el modelo leyó igual.
    { nombre: 'Caratula', estado: 'movimientos', filas: 3, montos: [], columnas: {} },
  ],
};

/** Lo que el cliente mandó a corregir, para poder afirmar la forma exacta del cuerpo. */
let corregido: {
  hoja: string;
  forzar?: boolean;
  columnas?: Record<string, number>;
  destino?: 'transaction' | 'invoice' | 'bill';
} | null = null;

function conBackend0043() {
  corregido = null;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(typeof url === 'object' && 'url' in url ? url.url : url);
    if (u.includes('/corregir-hoja')) {
      corregido = JSON.parse(String(init?.body ?? '{}')) as typeof corregido;
      return Response.json({ reprocesando: true, hoja: corregido!.hoja });
    }
    return Response.json(RESUMEN_0043);
  }) as unknown as typeof fetch;
}

describe('el dueño puede rescatar una hoja y corregirle la columna', () => {
  test('"sí, esta hoja debería contar" manda `forzar` para ESA hoja', async () => {
    conBackend0043();
    pintar();
    await screen.findByText('Resumen_Ventas');

    /*
     * Hay varios controles con el mismo texto —uno por hoja descartada—, así que se toma el de
     * la fila de `Resumen_Ventas`. Apretar el que no es sería indistinguible en un `getAllBy`,
     * y el daño de rescatar la hoja equivocada es contar el dinero dos veces.
     */
    const fila = screen.getByText('Resumen_Ventas').closest('li')!;
    fireEvent.click(
      Array.from(fila.querySelectorAll('button')).find((b) =>
        b.textContent?.includes(es.upload.confirmacion.siCuenta),
      )!,
    );

    await waitFor(() => expect(corregido).not.toBeNull());
    expect(corregido).toEqual({ hoja: 'Resumen_Ventas', forzar: true });
  });

  test('el picker manda el ÍNDICE de la columna, no su nombre', async () => {
    conBackend0043();
    pintar();
    await screen.findByText('Ventas');

    // El de la fila de `Ventas`: hay uno por hoja, y abrir otra no muestra sus columnas.
    const filaVentas = screen.getByText('Ventas').closest('li')!;
    fireEvent.click(
      Array.from(filaVentas.querySelectorAll('button')).find((b) =>
        b.textContent?.includes(es.upload.confirmacion.verDetalle),
      )!,
    );
    await screen.findByText(es.upload.confirmacion.columnaCorrecta);

    // El dueño dice "el monto no sale de «Precio Unitario», sale de «Total Línea»".
    fireEvent.click(screen.getByRole('button', { name: 'Total Línea' }));

    await waitFor(() => expect(corregido).not.toBeNull());
    /*
     * `amount: 3` es la posición de «Total Línea» en `encabezados`. Mandar el NOMBRE dejaría
     * un override que el worker no puede consumir: `sheet_overrides.columnas` se indexa por
     * posición, igual que el mapa que devuelve el modelo.
     */
    expect(corregido).toEqual({ hoja: 'Ventas', columnas: { amount: 3 } });
  });

  test('las hojas SIN dinero van juntas y colapsadas, no listadas una por una', async () => {
    conBackend0043();
    pintar();
    await screen.findByText('Ventas');

    /*
     * Listadas sueltas entre las descartadas, una portada y unas notas hacen parecer que
     * descartamos medio archivo. El descarte que el dueño SÍ tiene que mirar es el que se
     * llevó dinero, y el ruido se lo tapa.
     */
    expect(screen.queryByText('Portada')).toBeNull();
    expect(screen.queryByText('Notas')).toBeNull();
    // Pero se dice cuántas son y se pueden abrir: esconderlas del todo sería ocultar el dato.
    const resumen = screen.getByText(es.upload.confirmacion.sinDatos.replace('{n}', '2'));
    fireEvent.click(resumen);
    expect(screen.getByText('Portada')).toBeTruthy();

    // Y el descarte CON dinero sigue arriba, entero: es el que se puede desmentir.
    expect(screen.getByText('Resumen_Ventas')).toBeTruthy();
  });
});

describe('lo que la pantalla AFIRMA de una hoja tiene que haber pasado', () => {
  test('una hoja sin monto medible no se anuncia como "3 movimientos"', async () => {
    /*
     * Medido en producción el 2026-09-01: `Portada` y `Notas` se listaban como
     * "3 movimientos · —" entre las hojas que sí cuentan. Llamar MOVIMIENTOS a tres renglones
     * de una carátula es la pantalla afirmando algo que no pasó, justo donde el dueño decide
     * si publicar.
     *
     * Y NO se esconde: produjo filas, así que va a publicar algo y agruparla contradiría el
     * portón. Lo que estaba mal era el texto.
     */
    conBackend0043();
    pintar();
    await screen.findByText('Caratula');

    const fila = screen.getByText('Caratula').closest('li')!;
    expect(fila.textContent).toContain(es.upload.confirmacion.usadaSinMonto.replace('{n}', '3'));
    expect(fila.textContent).not.toContain('movimientos');
    // Y la hoja que SÍ trae dinero sigue diciendo movimientos y su monto.
    expect(screen.getByText('Ventas').closest('li')!.textContent).toContain('8 movimientos');
  });

  test('el aviso de conceptos NO promete un número que el panel desmiente', async () => {
    /*
     * Decía "Quedaron {n} conceptos" con `n` = FILAS MARCADAS, y el panel de abajo —que cuenta
     * CONCEPTOS contestables— decía otra cosa sobre la misma carga: medido en producción, 30
     * arriba contra 4 abajo. Es el mismo fallo que `conceptos-pendientes` ya documenta del lado
     * del correo, y encima llamaba "conceptos" a las filas.
     */
    conBackend0043();
    pintar();
    await screen.findByText('Ventas');
    expect(es.upload.confirmacion.conceptosHint).not.toContain('{n}');
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * A DÓNDE LLEGA CADA HOJA (reporte de Jose, 2026-09-01)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * *"La data no va únicamente al dashboard… si ponemos solo los del dashboard y el campo va a
 * cuentas por pagar, no lo estamos registrando."*
 *
 * El portón mostraba el dinero y el tipo —los rubros del dashboard— y callaba que la misma
 * fila puede aterrizar en Por cobrar, Por pagar, Inventario o Ventas por producto. El dueño
 * aprobaba su archivo viendo una parte de lo que hace.
 */
describe('el portón dice a qué pantallas llega cada hoja', () => {
  test('lista los destinos con el nombre del MENÚ, no del esquema', async () => {
    conBackend0043();
    pintar();
    await screen.findByText('Ventas');

    const filaVentas = screen.getByText('Ventas').closest('li')!;
    fireEvent.click(
      Array.from(filaVentas.querySelectorAll('button')).find((b) =>
        b.textContent?.includes(es.upload.confirmacion.verDetalle),
      )!,
    );
    await screen.findByText(es.upload.confirmacion.destinosTitulo);

    /*
     * Los tres, y el de `porCobrar` es el que motivó el reporte: una factura emitida mueve el
     * dashboard Y la cuenta por cobrar, y la pantalla solo contaba lo primero.
     */
    for (const d of ['ingresos', 'porCobrar', 'productos'] as const) {
      expect(screen.getByText(es.upload.confirmacion.destino[d])).toBeTruthy();
    }
  });

  test('⚠️ `other` se muestra como "no suma en ningún reporte", con aviso', async () => {
    /*
     * `rollups.ts` suma revenue/cogs/opex: una fila `other` se guarda y no aparece en ninguna
     * cifra. Jose preguntó por escrito dónde caía eso, y la respuesta honesta es "en ningún
     * lado que se vea". Va en tono de AVISO y no en el gris de los demás porque es lo único de
     * la lista que el dueño tiene que corregir.
     */
    globalThis.fetch = (async () =>
      Response.json({
        ...RESUMEN_0043,
        detalle: {
          Ventas: { tipos: { other: 8 }, muestra: [], destinos: ['sinPantalla'] },
        },
      })) as unknown as typeof fetch;
    pintar();
    await screen.findByText('Ventas');

    const filaVentas = screen.getByText('Ventas').closest('li')!;
    fireEvent.click(
      Array.from(filaVentas.querySelectorAll('button')).find((b) =>
        b.textContent?.includes(es.upload.confirmacion.verDetalle),
      )!,
    );

    const chip = await screen.findByText(es.upload.confirmacion.destino.sinPantalla);
    expect(chip.className).toContain('warning');
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * LOS CAMPOS DE TODAS LAS PANTALLAS (reporte de Jose, 2026-09-01)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * *"No solo los campos del dashboard, sino los campos de analítica y los campos de
 * inventario."* La muestra pintaba seis campos elegidos a mano —los del estado de resultados—
 * y el pipeline extrae once.
 */
describe('la muestra enseña los campos de las otras pantallas', () => {
  const conCampos = (campos: { clave: string; valor: string }[]) => {
    globalThis.fetch = (async () =>
      Response.json({
        ...RESUMEN_0043,
        detalle: {
          Ventas: {
            tipos: { revenue: 8 },
            destinos: ['ingresos'],
            muestra: [
              {
                fecha: null,
                concepto: null,
                monto: 1290,
                moneda: 'USD',
                tipo: 'invoice',
                categoria: 'facturacion',
                campos,
              },
            ],
          },
        },
      })) as unknown as typeof fetch;
  };

  const abrirVentas = async () => {
    pintar();
    await screen.findByText('Ventas');
    const fila = screen.getByText('Ventas').closest('li')!;
    fireEvent.click(
      Array.from(fila.querySelectorAll('button')).find((b) =>
        b.textContent?.includes(es.upload.confirmacion.verDetalle),
      )!,
    );
  };

  test('⚠️ una cuenta por cobrar enseña su VENCIMIENTO con nombre', async () => {
    /*
     * Es el campo que decide el tramo de antigüedad de Por cobrar y Por pagar, o sea cómo se ve
     * esa pantalla entera. Un vencimiento mal leído manda la cartera al tramo equivocado **sin
     * cambiar un solo total**, así que ni el cuadre ni el dueño lo veían.
     */
    conCampos([
      { clave: 'emision', valor: '2026-01-07' },
      { clave: 'vencimiento', valor: '2026-02-06' },
      { clave: 'contraparte', valor: 'Cliente 2' },
    ]);
    await abrirVentas();
    await screen.findByText(es.upload.confirmacion.primerasFilas);

    // Con su nombre en el idioma del dueño, no con la clave del esquema.
    expect(screen.getByText(es.upload.confirmacion.campo.vencimiento)).toBeTruthy();
    expect(screen.getByText('2026-02-06')).toBeTruthy();
    expect(screen.getByText(es.upload.confirmacion.campo.contraparte)).toBeTruthy();
  });

  test('una carga vieja SIN `campos` sigue mostrando su línea, no una vacía', async () => {
    /*
     * Degrada, no rompe: un documento de antes del cambio no trae el campo nuevo y su panel
     * tiene que seguir sirviendo — es el mismo criterio que el `?doc=` que ya no existe.
     */
    globalThis.fetch = (async () =>
      Response.json({
        ...RESUMEN_0043,
        detalle: {
          Ventas: {
            tipos: { revenue: 8 },
            destinos: ['ingresos'],
            muestra: [
              {
                fecha: '2026-01-08',
                concepto: 'Cliente 1',
                monto: 1240.5,
                moneda: 'GTQ',
                tipo: 'revenue',
                categoria: 'ventas',
              },
            ],
          },
        },
      })) as unknown as typeof fetch;
    await abrirVentas();
    await screen.findByText(es.upload.confirmacion.primerasFilas);
    expect(screen.getByText(/2026-01-08.*Cliente 1/)).toBeTruthy();
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * "¿DÓNDE SE REGISTRA?" ES UNA PREGUNTA APARTE (reporte de Jose, 2026-09-01)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * *"Si ponemos solo los del dashboard y el campo va a cuentas por pagar, no lo estamos
 * registrando."*
 *
 * Las cuatro opciones de "qué es" son los `type` del estado de resultados. La ENTIDAD la
 * decidía solo la estructura de la hoja y no había forma de corregirla: una hoja de cobros
 * leída como ventas deja la cartera en CERO.
 */
describe('el dueño corrige dónde se registra una hoja', () => {
  test('las dos preguntas son SEPARADAS, no seis opciones en una lista', async () => {
    /*
     * Es la decisión de diseño que importa: una factura emitida es a la vez un INGRESO y una
     * CUENTA POR COBRAR. En una sola lista de seis, el dueño tendría que elegir entre dos
     * respuestas que ambas son ciertas y perdería la mitad.
     */
    conBackend0043();
    pintar();
    await screen.findByText('Ventas');
    const fila = screen.getByText('Ventas').closest('li')!;
    fireEvent.click(
      Array.from(fila.querySelectorAll('button')).find((b) =>
        b.textContent?.includes(es.upload.confirmacion.verDetalle),
      )!,
    );

    const grupos = await screen.findAllByRole('radiogroup');
    const nombres = grupos.map((g) => g.getAttribute('aria-label'));
    expect(nombres).toContain(es.upload.confirmacion.corregir);
    expect(nombres).toContain(es.upload.confirmacion.destinoTitulo);
  });

  test('elegir "una cuenta por cobrar" manda `destino: invoice`', async () => {
    conBackend0043();
    pintar();
    await screen.findByText('Ventas');
    const fila = screen.getByText('Ventas').closest('li')!;
    fireEvent.click(
      Array.from(fila.querySelectorAll('button')).find((b) =>
        b.textContent?.includes(es.upload.confirmacion.verDetalle),
      )!,
    );
    await screen.findByText(es.upload.confirmacion.destinoTitulo);

    fireEvent.click(screen.getByText(es.upload.confirmacion.destinoOpcion.invoice));
    await waitFor(() => expect(corregido).not.toBeNull());
    /*
     * `invoice` y no un texto libre: es la clave que el worker consume por
     * `sheet_overrides.destino`. Otro valor sería un 200 que no hace nada.
     */
    expect(corregido).toEqual({ hoja: 'Ventas', destino: 'invoice' });
  });
});
