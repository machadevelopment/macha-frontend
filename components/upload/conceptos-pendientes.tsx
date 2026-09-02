'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { InsightPoint } from '@/components/ui/insight-point';
import { cn } from '@/lib/cn';
import { request } from '@/lib/api/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney, formatNumber } from '@/lib/format';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * "Solo tú sabes qué son estos" — el cliente clasifica lo que la ingesta no entendió.
 *
 * ═══ POR QUÉ ESTO VIVE EN EL FLUJO DE SUBIDA Y NO EN REVISIÓN INTERNA ═══
 *
 * Decisión de Semi, 2026-08-20. El motivo no es de costos ni de carga de trabajo: es que la
 * respuesta correcta la tiene el DUEÑO. Nosotros podemos adivinar qué es "Cropa"; él lo sabe.
 * Mandarlo a revisión interna significa que un operador de Macha adivine mejor, con menos
 * información, más tarde y para siempre.
 *
 * ═══ SE PREGUNTA POR CONCEPTO, NO POR FILA ═══
 *
 * Es lo que hace viable la pantalla. Un archivo con 400 filas marcadas puede tener seis
 * conceptos distintos; preguntar por fila serían 400 preguntas y nadie las contesta — sería
 * revisión interna con otro nombre, en la cara del cliente. Por concepto son seis, cada
 * respuesta ordena todas sus filas de una vez, y queda aprendida para las cargas siguientes.
 *
 * El agrupado lo hace el backend con la MISMA normalización que usa el diccionario para
 * guardar y buscar, así que "Pago a CLARO" y "pago claro" llegan acá como una sola pregunta.
 *
 * ═══ QUÉ SE LE PREGUNTA Y QUÉ NO ═══
 *
 * Qué ES (ingreso / costo de lo que vende / gasto de operación / otro) y el nombre del rubro.
 * NO se le pregunta si es una transacción, una factura o una cuenta por pagar: eso es una forma
 * contable que el sistema ya determinó al leer la fila, y preguntársela sería pedirle una
 * decisión de contabilidad en vez de una de su negocio.
 *
 * El desplegable dice "Un gasto de operación", no `opex`. El valor que viaja es `opex` porque es
 * lo que el backend acota, pero nadie que lleve una tienda debería tener que aprender la
 * palabra.
 *
 * ═══ PLEGADO POR DEFECTO ═══
 *
 * Va cerrado y con el conteo en el disparador, igual que "ver qué entendimos". La lista de
 * cargas es una pantalla de estado: abrir un formulario solo, en cada documento con filas
 * pendientes, la volvería ilegible. El conteo en el botón es lo que hace que valga abrirlo.
 */

/** Moneda que el producto maneja. `formatMoney` no acepta otra. */
type Moneda = 'GTQ' | 'USD';

interface Concepto {
  /** La clave normalizada. Es lo que se manda de vuelta, no el texto que se muestra. */
  concepto: string;
  /** El texto crudo del archivo. El cliente reconoce lo que él escribió, no `claro|pago`. */
  ejemplo: string;
  filas: number;
  /**
   * Totales POR MONEDA, no un total único, y eso viene así del backend a propósito: estas filas
   * están en staging, traen `originalAmount` + `originalCurrency` y todavía no tienen la cifra
   * convertida (la conversión ocurre al promover, con la tasa snapshoteada por fila).
   *
   * Sumar GTQ con USD daría un número que no es ninguna de las dos cosas, pintado al lado del
   * concepto como si fuera plata de verdad. Se muestran por separado; con una sola moneda —el
   * caso común— se ve igual que un total.
   */
  montos: { currency: string; total: number }[];
  /**
   * ═══════════════════════════════════════════════════════════════════════════════════════
   * DÓNDE VIVE ESTE CONCEPTO, ADEMÁS DEL DASHBOARD (reporte de Jose, 2026-09-01)
   * ═══════════════════════════════════════════════════════════════════════════════════════
   *
   * *"Si ponemos solo los del dashboard y el campo va a cuentas por pagar, no lo estamos
   * registrando."*
   *
   * El backend manda este campo desde el principio y **el componente no lo leía**. Las cuatro
   * opciones que el cliente ve son los `type` del ESTADO DE RESULTADOS, así que una fila que es
   * una CUENTA POR PAGAR se le presentaba igual que una venta de mostrador: contestaba "es un
   * costo" sin que nada le dijera que además le está debiendo a alguien y que ese concepto va a
   * aparecer en Por pagar.
   *
   * Acá solo se MUESTRA. Corregirlo exige releer el archivo —el payload de una `transaction` no
   * guarda `counterparty` ni `dueDate`— y eso se hace por HOJA, en el panel del portón. Ofrecer
   * cambiarlo desde acá prometería algo que no se puede hacer bien: la factura nacería sin
   * contraparte ni vencimiento, y el aging la mandaría entera a "corriente".
   */
  entity?: 'transaction' | 'invoice' | 'bill';
  /**
   * La hoja de la que salen sus filas, o `null` si salen de VARIAS.
   *
   * Con `null` no se ofrecen las dos opciones de cuenta: cambiar la entidad reprocesa la hoja
   * ENTERA, y con dos hojas tocaría las dos — que no es lo que el cliente está pidiendo.
   */
  hoja?: string | null;
}

type TipoDeMovimiento = 'revenue' | 'cogs' | 'opex' | 'other';

/** Lo que el cliente va contestando, indexado por la clave del concepto. */
type Respuestas = Record<string, { type: TipoDeMovimiento; category: string }>;

const TIPOS: TipoDeMovimiento[] = ['revenue', 'cogs', 'opex', 'other'];

/**
 * Los montos del concepto, una moneda por vez y separados por " + ".
 *
 * Nunca se suman entre sí: ver la nota de `Concepto.montos`. Una moneda que el producto no
 * maneja se cae en vez de formatearse a la fuerza — `formatMoney` acota a GTQ/USD, y mostrar
 * una tercera con el símbolo equivocado sería peor que no mostrarla.
 *
 * ═══ POR QUÉ TOLERA QUE `montos` NO VENGA ═══
 *
 * Los dos repos NO despliegan de forma atómica: este componente vive en Vercel y el endpoint en
 * Railway, con deploys independientes que pueden tardar distinto o fallar uno solo. Durante esa
 * ventana el backend puede devolver una forma vieja.
 *
 * Ya pasó, y por eso está escrito acá: una versión anterior del endpoint devolvía un `montoTotal`
 * único, y `montos.filter(...)` sobre `undefined` no degradaba — **reventaba el panel entero** al
 * abrirlo. El cliente no veía "sin monto": veía una pantalla rota.
 *
 * La regla que queda: en un dato de APOYO, no poder mostrarlo vale mucho menos que tumbar la
 * pantalla que sí sirve. La lista de conceptos se contesta perfectamente sin la cifra.
 */
function montosLegibles(montos: Concepto['montos'] | undefined, locale: Locale): string {
  if (!Array.isArray(montos)) return '';
  return montos
    .filter(
      (m): m is { currency: Moneda; total: number } =>
        typeof m?.total === 'number' && (m.currency === 'GTQ' || m.currency === 'USD'),
    )
    .map((m) => formatMoney(m.total, m.currency, locale))
    .join(' + ');
}

export function ConceptosPendientes({
  documentId,
  labels,
  common,
  locale,
  onResuelto,
  abrirAlMontar = false,
}: {
  documentId: string;
  labels: Dictionary['upload']['conceptos'];
  common: Dictionary['common'];
  locale: Locale;
  /** Para que la lista de cargas refresque su conteo de filas marcadas. */
  onResuelto?: () => void;
  /**
   * Abrir el panel sin esperar un clic, para quien llegó desde el correo (`/upload?doc=<id>`).
   *
   * Va como PROP y no leyendo el parámetro acá: este componente se monta una vez por documento
   * de la lista, y que cada instancia consultara la URL para decidir si le toca sería repartir
   * la misma decisión entre N copias. La lee la pantalla, que es quien conoce la lista.
   */
  abrirAlMontar?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [conceptos, setConceptos] = useState<Concepto[] | undefined>(undefined);
  const [respuestas, setRespuestas] = useState<Respuestas>({});
  const [guardando, setGuardando] = useState(false);
  /**
   * Qué hoja se está moviendo a cuenta por cobrar/pagar.
   *
   * Elegir una de las dos opciones de cuenta REPROCESA el archivo, así que no es un cambio
   * local como elegir un tipo: hay que esperar al worker. Sin este estado el cliente aprieta,
   * no pasa nada visible y vuelve a apretar — y el backend rechaza la segunda con un 409 (una
   * corrección a la vez por carga), así que vería un error por insistir.
   */
  const [moviendo, setMoviendo] = useState<string | null>(null);

  const [error, setError] = useState(false);
  const [resueltas, setResueltas] = useState<number | null>(null);
  /**
   * Cuál de los conceptos se está preguntando. Es lo único que el rediseño agrega al estado:
   * las respuestas siguen acumulándose en `respuestas` y se mandan TODAS JUNTAS al final, con
   * el mismo `POST` de una sola llamada que ya existía.
   *
   * Se guarda el ÍNDICE y no el concepto porque `conceptos` se filtra al guardar (se quitan los
   * contestados), y un índice sobre la lista viva es lo que hace que "siguiente" siga
   * significando lo mismo después de esa poda.
   */
  const [indice, setIndice] = useState(0);

  /**
   * Pide la lista de conceptos.
   *
   * Se extrajo de `alternar` porque ahora tiene DOS llamadores: la apertura del panel y el
   * regreso de "esto es una cuenta por cobrar/pagar", que reprocesa la hoja y por lo tanto
   * cambia los conceptos que salían de ella. Con una copia por llamador, uno de los dos se
   * quedaría con la lista vieja.
   */
  const cargar = useCallback(async () => {
    const r = await request<{ conceptos: Concepto[] }>(
      `/api/documents/${documentId}/conceptos-pendientes`,
    );
    if (!r.ok) {
      setError(true);
      return;
    }
    setConceptos(r.data.conceptos);
    /*
     * Y se vuelve a la primera pregunta: tras el reproceso la lista es otra, así que un índice
     * viejo apuntaría a un concepto que ya no está en esa posición.
     */
    setIndice(0);
  }, [documentId]);

  /**
   * "Esto es una cuenta por cobrar/pagar" desde la lista de conceptos.
   *
   * ⚠️ Va por `corregir-hoja` y NO por el POST de conceptos, y esa es la diferencia que importa:
   * cambiar la entidad exige releer el archivo —el payload de una `transaction` no guarda
   * `counterparty` ni `dueDate`— así que es el mismo camino que el control por hoja del portón.
   * Mandarlo por el POST de conceptos crearía una factura sin vencimiento y el aging la pondría
   * entera en "corriente".
   *
   * Toca la hoja COMPLETA, no solo las filas de este concepto: la entidad es una propiedad de
   * la hoja. El aviso de la pantalla lo nombra para que el cliente no se sorprenda.
   */
  const aCuenta = useCallback(
    async (hoja: string, destino: 'invoice' | 'bill') => {
      setMoviendo(hoja);
      setError(false);
      const r = await request(`/api/documents/${documentId}/corregir-hoja`, {
        method: 'POST',
        body: JSON.stringify({ hoja, destino }),
      });
      if (!r.ok) {
        setMoviendo(null);
        setError(true);
        return;
      }
      /*
       * Se recarga la lista cuando el worker termina: el reproceso cambia las filas de esa hoja,
       * así que los conceptos que salían de ella ya no son los mismos. Tope de 60 sondeos de
       * 2 s, y al agotarse se recarga igual — el cliente tiene que ver el estado REAL y no una
       * promesa que no se cumplió.
       */
      for (let i = 0; i < 60; i++) {
        await new Promise((x) => setTimeout(x, 2000));
        const d = await request<{ status: string }>(`/api/documents/${documentId}/confirmacion`);
        if (d.ok && d.data.status !== 'processing') break;
      }
      setMoviendo(null);
      await cargar();
    },
    [documentId, cargar],
  );

  async function alternar() {
    const siguiente = !abierto;
    setAbierto(siguiente);
    if (!siguiente || conceptos !== undefined) return;
    await cargar();
  }

  /*
   * La apertura automática pasa por `alternar()` y no por `setAbierto(true)`: es `alternar`
   * quien además PIDE los conceptos. Abrir sin pedirlos dejaría al cliente que viene del correo
   * mirando un panel abierto y vacío, que es peor que uno cerrado.
   *
   * Corre una sola vez por montaje. `abrirAlMontar` sale del parámetro de la URL, que no cambia
   * mientras la pantalla vive; volver a abrirlo tras cerrarlo sería pelearle al usuario.
   */
  const abrioSolo = useRef(false);
  useEffect(() => {
    if (!abrirAlMontar || abrioSolo.current) return;
    abrioSolo.current = true;
    void alternar();
    // `alternar` se recrea en cada render y meterla como dependencia reabriría el panel en
    // bucle; lo que gobierna este efecto es la bandera, que es estable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirAlMontar]);

  /*
   * Solo se mandan los conceptos que el cliente REALMENTE contestó (con rubro escrito). Un
   * desplegable trae un valor por defecto y un campo vacío no: exigir el rubro es lo que evita
   * que un `Enter` distraído clasifique media carga como "gasto de operación" sin nombre.
   */
  const listas = Object.entries(respuestas).filter(([, r]) => r.category.trim() !== '');

  async function guardar() {
    setGuardando(true);
    setError(false);

    const r = await request<{ filasResueltas: number }>(`/api/documents/${documentId}/conceptos`, {
      method: 'POST',
      body: JSON.stringify({
        respuestas: listas.map(([concepto, v]) => ({
          concepto,
          type: v.type,
          category: v.category.trim(),
        })),
      }),
    });
    setGuardando(false);

    if (!r.ok) {
      setError(true);
      return;
    }
    setResueltas(r.data.filasResueltas);
    /*
     * Se quitan de la lista los que se acaban de contestar en vez de volver a pedirla. No es
     * por ahorrar la petición: la promoción va por cola, así que un GET inmediato podría
     * devolverlos todavía pendientes y el cliente vería reaparecer lo que acaba de contestar.
     */
    const contestados = new Set(listas.map(([c]) => c));
    setConceptos((previos) => (previos ?? []).filter((c) => !contestados.has(c.concepto)));
    setRespuestas({});
    setIndice(0);
    onResuelto?.();
  }

  function actualizar(
    clave: string,
    cambio: Partial<{ type: TipoDeMovimiento; category: string }>,
  ) {
    setRespuestas((prev) => ({
      ...prev,
      [clave]: {
        type: prev[clave]?.type ?? 'opex',
        category: prev[clave]?.category ?? '',
        ...cambio,
      },
    }));
  }

  /**
   * ⚠️ El conteo solo se AFIRMA cuando ya se pidió la lista. Antes decía `?? 0`, así que el
   * disparador cerrado leía "Ayúdanos a clasificar 0 concepto(s)" hasta que alguien lo abría
   * —y `conceptos` solo se pide AL abrir, o sea siempre—. Le decía al cliente que no queda
   * nada por contestar justo en el control que existe para que conteste: la razón más directa
   * para no hacer clic. Sin lista todavía, el texto no lleva número.
   */
  const pendientes = conceptos?.length;
  /** El concepto que se está preguntando, y el que viene, para nombrarlo en el botón. */
  const actual = conceptos?.[indice];
  const siguiente = conceptos?.[indice + 1];
  const esUltimo = conceptos !== undefined && indice >= conceptos.length - 1;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void alternar()}
        aria-expanded={abierto}
        className="flex items-center gap-1.5 self-start text-body text-muted-foreground hover:text-foreground"
      >
        <ChevronRight
          className={cn('h-4 w-4 shrink-0 text-faint transition-transform', abierto && 'rotate-90')}
          strokeWidth={1.7}
        />
        <HelpCircle className="h-3.5 w-3.5 shrink-0 text-faint" strokeWidth={1.7} />
        {pendientes === undefined
          ? labels.ctaSinConteo
          : labels.cta.replace('{n}', formatNumber(pendientes, locale))}
      </button>

      {abierto && (
        <div className="flex min-w-0 flex-col gap-3 rounded-md border border-border bg-muted px-3 py-2.5">
          {error && <p className="text-body text-danger">{labels.error}</p>}

          {!error && conceptos === undefined && (
            <p className="text-body text-faint" aria-busy="true">
              {common.loading}
            </p>
          )}

          {/*
            El mensaje de "listo" y el de "no hay nada" son DISTINTOS a propósito: el primero
            es la prueba de que contestar cambió algo —dice cuántas filas se acomodaron—, y el
            segundo es el estado de una carga que nunca tuvo nada pendiente. Colapsarlos dejaría
            al cliente sin saber si su respuesta sirvió.
          */}
          {resueltas !== null && (
            <p className="text-body text-success">
              {labels.done.replace('{n}', formatNumber(resueltas, locale))}
            </p>
          )}
          {!error && conceptos?.length === 0 && resueltas === null && (
            <p className="text-body text-faint">{labels.empty}</p>
          )}

          {conceptos && conceptos.length > 0 && actual && (
            /*
             * ═══════════════════════════════════════════════════════════════════════════════
             * UNA PREGUNTA A LA VEZ (CU-868kyur58) — RÉPLICA DEL HTML QUE APROBÓ JOSE
             * ═══════════════════════════════════════════════════════════════════════════════
             *
             * Antes esto listaba TODOS los conceptos apilados, cada uno con un `<Select>` chico
             * y un `<Input>`. Se veía y se sentía como un formulario de trabajo, y lo que el
             * cliente tiene que hacer son dos o tres decisiones simples sobre su propio negocio.
             *
             * ⚠️ **Es un cambio de PRESENTACIÓN y nada más.** Mismo contrato (`Concepto`,
             * `Respuestas`), mismo endpoint, misma llamada única al guardar. Lo que cambia es
             * que se muestra un concepto por vez y que las opciones son tarjetas grandes en vez
             * de un desplegable.
             *
             * Las medidas salen del HTML de referencia, traducidas a tokens y NO a los hex del
             * archivo: `--brand-soft` en vez de `#eef1ec`, `--brand-ink` en vez de `#4a5745`.
             * Escribir el hex es el error que parece fidelidad — no tiene contraparte en tema
             * oscuro, y quien tenga el sistema en oscuro vería un bloque claro cegador.
             */
            <div className="flex flex-col gap-0 rounded-2xl border border-border bg-card px-[30px] py-[26px] shadow-sm">
              {/* Cabecera: el orbe de marca al lado del título, como en el archivo. */}
              <div className="flex items-center gap-3.5">
                <InsightPoint size="md" className="shrink-0" />
                <p className="text-[18px] font-bold leading-tight">{labels.title}</p>
              </div>
              <p className="ml-[52px] mt-0.5 text-body text-muted-foreground">{labels.subtitle}</p>

              {/*
                PROGRESO. El ticket lo pide y resuelve la pregunta que un flujo paso a paso
                genera solo: "¿cuántas faltan?". Sin esto, una pregunta a la vez se siente
                interminable justo cuando hay varias — que es cuando más importa que no lo sea.

                Los puntos van `aria-hidden` y el estado real viaja en un texto para lector de
                pantalla: cuatro rectángulos de color no dicen nada a quien no los ve.

                ⚠️ El punto CONTESTADO usa el verde FUNCIONAL (`bg-success`) y el actual la
                tinta de marca. No es decorativo: "esto ya está" es un estado del dato, y la
                regla de los dos verdes reserva el salvia para "esto es Macha".
              */}
              <div className="ml-[52px] mt-4 mb-[18px] flex gap-[5px]" aria-hidden="true">
                {conceptos.map((c, i) => (
                  <span
                    key={c.concepto}
                    className={cn(
                      'h-1 w-[22px] rounded-sm',
                      i < indice && 'bg-success',
                      i === indice && 'bg-brand-ink',
                      i > indice && 'bg-border',
                    )}
                  />
                ))}
              </div>
              <p className="sr-only" aria-live="polite">
                {labels.progress
                  .replace('{n}', formatNumber(indice + 1, locale))
                  .replace('{total}', formatNumber(conceptos.length, locale))}
              </p>

              {/*
                EL CONCEPTO, destacado. `break-words` y no `truncate`: la descripción de una
                fila real puede ser larga, y recortarla le quita al cliente justo aquello con lo
                que reconoce su propio concepto.
              */}
              <div className="mb-4 rounded-lg bg-brand-soft px-[18px] py-3.5">
                <p className="break-words text-[16px] font-bold">{actual.ejemplo}</p>
                <p className="mt-0.5 font-mono text-delta tabular-nums text-brand-ink">
                  {labels.rows
                    .replace('{n}', formatNumber(actual.filas, locale))
                    .replace('{monto}', montosLegibles(actual.montos, locale))}
                </p>
                {/*
                  ⚠️ DÓNDE VIVE ESTE CONCEPTO, ADEMÁS DEL DASHBOARD (reporte de Jose, 2026-09-01).

                  "Si ponemos solo los del dashboard y el campo va a cuentas por pagar, no lo
                  estamos registrando."

                  Las cuatro opciones de abajo son los `type` del ESTADO DE RESULTADOS. El
                  backend manda `entity` desde el principio y este componente NO LO LEÍA, así
                  que una fila que es una CUENTA POR PAGAR se presentaba igual que una venta de
                  mostrador: el cliente contestaba "es un costo" sin que nada le dijera que
                  además le debe a alguien y que ese concepto va a salir en Por pagar.

                  Solo se DICE, no se ofrece cambiar: corregir la entidad exige releer el
                  archivo —el payload de una transacción no guarda contraparte ni vencimiento— y
                  eso se hace por HOJA. Ofrecerlo acá prometería algo que no se puede hacer
                  bien: la factura nacería sin vencimiento y el aging la mandaría entera a
                  "corriente". El texto nombra dónde ir.
                */}
                {(actual.entity === 'invoice' || actual.entity === 'bill') && (
                  <p className="mt-2 border-t border-brand-bd pt-2 text-micro text-brand-ink">
                    {labels.vive[actual.entity]}{' '}
                    <span className="opacity-70">{labels.vive.siEstaMal}</span>
                  </p>
                )}
              </div>

              {/*
                "QUÉ ES" — cuatro tarjetas grandes en vez de un desplegable.
                `role="radiogroup"` con `<button role="radio">`: visualmente son tarjetas y
                semánticamente son lo que son, una elección única. Un `<div onClick>` dejaría
                esto fuera del teclado y sin anunciar, que es media implementación.
              */}
              <p className="mb-2 font-mono text-eyebrow uppercase tracking-wide text-faint">
                {labels.typeLabel}
              </p>
              <div
                role="radiogroup"
                aria-label={labels.typeLabel}
                className="mb-[18px] grid grid-cols-1 gap-2.5 sm:grid-cols-2"
              >
                {TIPOS.map((t) => {
                  const elegido = (respuestas[actual.concepto]?.type ?? 'opex') === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={elegido}
                      onClick={() => actualizar(actual.concepto, { type: t })}
                      className={cn(
                        'rounded-xl border-[1.5px] p-4 text-left text-body font-semibold transition-colors',
                        elegido
                          ? 'border-brand-ink bg-brand-soft text-brand-ink'
                          : 'border-border hover:border-brand-bd',
                      )}
                    >
                      {labels.type[t]}
                      <span
                        className={cn(
                          'mt-0.5 block text-micro font-normal',
                          elegido ? 'text-brand-ink opacity-80' : 'text-muted-foreground',
                        )}
                      >
                        {labels.typeHint[t]}
                      </span>
                    </button>
                  );
                })}

                {/*
                  ⚠️ LAS DOS CUENTAS, EN LA MISMA LISTA (reporte de Jose, 2026-09-01).

                  "No solo los campos del dashboard, sino los campos de analítica… si el campo
                  va a cuentas por pagar, no lo estamos registrando."

                  Las cuatro de arriba son los `type` del estado de resultados. Estas dos son la
                  otra dimensión —dónde vive la fila— y van acá porque es lo que el dueño pidió:
                  la lista completa de lo que su archivo puede ser, en un solo lugar.

                  ⚠️ NO son un `type` más: elegirlas REPROCESA la hoja. Cambiar la entidad exige
                  releer el archivo, porque el payload de una transacción no guarda
                  `counterparty` ni `dueDate` — y sin el vencimiento el aging manda la cartera
                  entera a "corriente" (medido: GTQ 6.250 en `current` para una hoja sin esa
                  columna). Por eso llevan su aviso y disparan otro camino.

                  Solo se ofrecen cuando el concepto ya es un MOVIMIENTO —si ya es una cuenta, no
                  hay nada que cambiar— y cuando viene de UNA hoja: con dos, el reproceso tocaría
                  las dos enteras, que no es lo que el cliente está pidiendo.
                */}
                {actual.entity === 'transaction' &&
                  actual.hoja &&
                  (['invoice', 'bill'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={false}
                      disabled={moviendo !== null}
                      onClick={() => void aCuenta(actual.hoja!, k)}
                      className={cn(
                        'rounded-xl border-[1.5px] border-dashed p-4 text-left text-body font-semibold transition-colors disabled:opacity-50',
                        'border-border hover:border-brand-bd',
                      )}
                    >
                      {labels.cuenta[k]}
                      <span className="mt-0.5 block text-micro font-normal text-muted-foreground">
                        {labels.cuenta[k === 'invoice' ? 'invoiceDesc' : 'billDesc']}
                      </span>
                    </button>
                  ))}
              </div>

              {/*
                El aviso de que estas dos reprocesan. Va fuera del grupo y una sola vez: es la
                misma consecuencia para las dos, y repetirlo en cada tarjeta las haría ilegibles.
              */}
              {actual.entity === 'transaction' && actual.hoja && (
                <p className="mb-[18px] text-micro text-muted-foreground">
                  {labels.cuenta.aviso.replace('{hoja}', actual.hoja)}
                </p>
              )}

              {/* RUBRO: sigue siendo texto libre, con el aire que pide el archivo. */}
              <div className="mb-5 flex flex-col gap-1.5">
                <label
                  htmlFor={`rubro-${documentId}`}
                  className="font-mono text-eyebrow uppercase tracking-wide text-faint"
                >
                  {labels.categoryLabel}
                </label>
                <Input
                  id={`rubro-${documentId}`}
                  className="rounded-lg border-[1.5px] px-3.5 py-2.5 text-body"
                  value={respuestas[actual.concepto]?.category ?? ''}
                  onChange={(e) => actualizar(actual.concepto, { category: e.target.value })}
                  placeholder={labels.categoryPlaceholder}
                  maxLength={80}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/*
                  ATRÁS (pedido de Keneth, 2026-09-01: *"por si presiono eso por accidente y no
                  estaba seguro"*). Avanzar era irreversible y el botón de avanzar está pegado
                  al de omitir, así que equivocarse costaba un clic y no había vuelta.
                
                  No pierde nada: las respuestas viven en `respuestas`, indexadas por concepto,
                  y el formulario las vuelve a leer al volver — que es la misma garantía que
                  hace que avanzar no borre lo anterior. Solo aparece si hay a dónde volver.
                */}
                {indice > 0 && (
                  <button
                    type="button"
                    onClick={() => setIndice(indice - 1)}
                    className="flex items-center gap-1 text-body text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                    {labels.atras}
                  </button>
                )}
                {/*
                  El botón NOMBRA el siguiente concepto. Es del archivo y es lo que convierte
                  "guardar" en "ya casi": el cliente ve que queda uno y cuál es, en vez de
                  apretar a ciegas.

                  ⚠️ Va deshabilitado sin rubro EN ESTE concepto, y la condición mira `respuestas`
                  y no `listas`. Con `listas.length === 0` el candado solo protegía a la PRIMERA
                  pregunta: contestada una, el botón quedaba activo para todas las siguientes con
                  el campo vacío, y apretarlo avanzaba sin guardar nada de la que se estaba
                  mirando. Es peor que un botón apagado justo por el motivo que este comentario
                  ya decía — el cliente lee "Guardar y seguir", lo aprieta, y ese concepto queda
                  sin contestar sin que nada se lo diga. Encontrado abriendo la pantalla en
                  producción (2026-09-01); "Omitir por ahora" sigue siendo el camino explícito
                  para pasar de largo.
                */}
                <Button
                  size="sm"
                  className="rounded-lg px-[22px] py-2.5"
                  disabled={
                    guardando || (respuestas[actual.concepto]?.category ?? '').trim() === ''
                  }
                  onClick={() => (esUltimo ? void guardar() : setIndice(indice + 1))}
                >
                  {guardando
                    ? labels.submitting
                    : esUltimo
                      ? labels.submitLast
                      : labels.submitNext.replace('{siguiente}', siguiente?.ejemplo ?? '')}
                </Button>
                {/*
                  OMITIR. En el último concepto guarda lo que ya haya contestado en vez de pasar
                  a un índice que no existe: omitir el último no puede significar tirar las tres
                  respuestas anteriores.
                */}
                <button
                  type="button"
                  className="text-body text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  onClick={() =>
                    esUltimo
                      ? listas.length > 0
                        ? void guardar()
                        : setAbierto(false)
                      : setIndice(indice + 1)
                  }
                >
                  {labels.skip}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
