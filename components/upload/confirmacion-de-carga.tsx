'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InsightPoint } from '@/components/ui/insight-point';
import { cn } from '@/lib/cn';
import { request } from '@/lib/api/browser';
import { formatNumber } from '@/lib/format';
import { dinero } from '@/components/upload/read-summary';
import { ConceptosPendientes } from '@/components/upload/conceptos-pendientes';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * EL PORTÓN: "ESTO ENTENDIMOS DE TU ARCHIVO", ANTES DE PUBLICARLO (migración 0042)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Decisión de Keneth. Ninguna carga entra al dashboard sola: el dueño ve primero el resumen
 * POR HOJA con el dinero que cada una aporta, y su contabilidad entra cuando dice que está
 * bien.
 *
 * ═══ POR QUÉ POR HOJA Y NO POR FILA ═══
 *
 * Porque los siete fallos de ingesta de esta semana NO fueron filas dudosas: fueron decisiones
 * sobre HOJAS, tomadas con alta confianza y equivocadas — una cartera de clientes leída como
 * ingresos (Q 13.362), un consolidado propio contado dos veces (+945), un presupuesto entrando
 * como dinero real, cobros devengando otra vez (+52 %). Ninguna la habría atrapado una revisión
 * fila por fila; todas se ven de un vistazo en una lista de hojas con su monto al lado.
 *
 * Y las hojas y los conceptos van en UNA sola pantalla porque son una sola parada. Dos
 * pantallas seguidas para la misma carga es la forma más segura de que la segunda no se
 * conteste.
 *
 * ═══ LO QUE ESTA PANTALLA NO HACE ═══
 *
 * Volver a INCLUIR una hoja que descartamos. Eso exige reprocesar el archivo con el modelo y es
 * un trabajo distinto; lo que sí hace es DECIR con su motivo qué hoja no se usó y cuánto dinero
 * se quedó afuera, que es lo que le permite al dueño desmentirnos. Excluir sí se puede, y es
 * barato: sus filas se rechazan por el mismo camino que usa staff.
 */

interface MontoPorMoneda {
  moneda: string;
  total: number;
  filas: number;
}

interface HojaResumen {
  nombre: string;
  /** De dónde salió cada dato: `{ fecha: 'Fecha', monto: 'Total Línea', … }`. */
  columnas?: Record<string, string | null>;
  /**
   * TODOS los encabezados de la hoja, en su orden real. `columnas` dice de dónde SALIÓ el
   * dato; esto es lo que permite elegir otro. Ausente en las cargas anteriores al 2026-09-01:
   * ahí el picker no se pinta, que es lo correcto — no hay contra qué elegir.
   */
  encabezados?: string[];
  estado: 'movimientos' | 'inventario' | 'descartada';
  filas?: number;
  motivo?: keyof Dictionary['upload']['readSummary']['reason'];
  montos?: MontoPorMoneda[];
}

const TIPOS = ['revenue', 'cogs', 'opex', 'other'] as const;

/**
 * Con qué tipo entró la hoja: el que más filas produjo.
 *
 * No es un promedio ni una suma: es "esta hoja entró como ingreso", que es lo que el dueño
 * necesita ver para saber si hay algo que corregir. Una hoja con dos tipos (venta + su costo
 * derivado) muestra el dominante, que es su naturaleza.
 */
function tipoDominante(d: DetalleDeHoja | undefined): string | null {
  const pares = Object.entries(d?.tipos ?? {});
  if (pares.length === 0) return null;
  return pares.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

interface FilaDeMuestra {
  fecha: string | null;
  concepto: string | null;
  monto: number | null;
  moneda: string | null;
  tipo: string;
  categoria: string | null;
}

interface DetalleDeHoja {
  muestra: FilaDeMuestra[];
  /** Cuántas filas produjo de cada tipo. Es lo que permite decir "entró como ingreso". */
  tipos: Record<string, number>;
}

interface Confirmacion {
  documentId: string;
  status: string;
  confirmedAt: string | null;
  filas: number;
  marcadas: number;
  hojas: HojaResumen[];
  detalle?: Record<string, DetalleDeHoja>;
}

export function ConfirmacionDeCarga({
  documentId,
  labels,
  reasonLabels,
  conceptosLabels,
  common,
  locale,
  onPublicado,
}: {
  documentId: string;
  labels: Dictionary['upload']['confirmacion'];
  reasonLabels: Dictionary['upload']['readSummary']['reason'];
  conceptosLabels: Dictionary['upload']['conceptos'];
  common: Dictionary['common'];
  locale: Locale;
  /** Para que la lista de cargas refresque su estado tras publicar. */
  onPublicado?: () => void;
}) {
  const [datos, setDatos] = useState<Confirmacion | null | undefined>(undefined);
  const [excluidas, setExcluidas] = useState<Set<string>>(new Set());
  const [publicando, setPublicando] = useState(false);
  const [error, setError] = useState(false);
  const [listo, setListo] = useState(false);
  /*
   * EL PASO DE "¿SEGURO?" (pedido de Keneth, 2026-09-01: *"botones de regresar por si presiono
   * eso por accidente y no estaba seguro"*).
   *
   * Publicar es el clic caro de esta pantalla y estaba a un solo toque, pegado a los controles
   * de excluir hojas. La salida no es esconder el botón sino que el paso diga QUÉ va a pasar
   * —cuántas hojas entran y cuántas quedan afuera— y ofrezca volver. Un "¿seguro?" que no dice
   * nada nuevo solo agrega un clic.
   */
  const [confirmando, setConfirmando] = useState(false);
  /** Qué hoja tiene el panel abierto. Una a la vez: la pantalla es para decidir, no para leer. */
  const [abierta, setAbierta] = useState<string | null>(null);
  /** Las correcciones de naturaleza que el cliente hizo, por hoja. */
  const [reclasificadas, setReclasificadas] = useState<Record<string, string>>({});
  /**
   * Qué hoja se está volviendo a leer.
   *
   * Rescatar una hoja o corregirle la columna **reprocesa el archivo**, así que no es un
   * cambio local como excluir: hay que esperar al worker. Sin este estado el cliente aprieta,
   * no pasa nada visible, y vuelve a apretar — que con un reproceso encolado es la forma más
   * directa de duplicarle el trabajo al worker.
   */
  const [reprocesando, setReprocesando] = useState<string | null>(null);
  /** Las hojas sin datos van colapsadas; esto las abre. Ver `sinDatos` en el diccionario. */
  const [verSinDatos, setVerSinDatos] = useState(false);

  const cargar = useCallback(async () => {
    const r = await request<Confirmacion>(`/api/documents/${documentId}/confirmacion`);
    return r.ok ? r.data : null;
  }, [documentId]);

  useEffect(() => {
    let vivo = true;
    void cargar().then((d) => {
      if (vivo) setDatos(d);
    });
    return () => {
      vivo = false;
    };
  }, [cargar]);

  /**
   * ═══════════════════════════════════════════════════════════════════════════════════════
   * "ESTA HOJA SÍ DEBERÍA CONTAR" / "EL MONTO ESTÁ EN OTRA COLUMNA" (migración 0043)
   * ═══════════════════════════════════════════════════════════════════════════════════════
   *
   * Las dos son la misma operación —reprocesar ESA hoja con la corrección— y por eso son una
   * sola función y un solo endpoint.
   *
   * ⚠️ Se ESPERA al worker sondeando el mismo endpoint que ya se usa, no con un `setTimeout`
   * a ojo: cuánto tarda depende del tamaño de la hoja y de si hay que pagarle al modelo.
   * Mientras tanto el control queda deshabilitado — un segundo clic encolaría otra corrida
   * sobre una carga que ya se está procesando.
   */
  const corregirHoja = useCallback(
    async (hoja: string, cambio: { forzar?: boolean; columnas?: Record<string, number> }) => {
      setReprocesando(hoja);
      setError(false);
      const r = await request(`/api/documents/${documentId}/corregir-hoja`, {
        method: 'POST',
        body: JSON.stringify({ hoja, ...cambio }),
      });
      if (!r.ok) {
        setReprocesando(null);
        setError(true);
        return;
      }
      /*
       * Hasta 60 sondeos de 2 s. El tope existe para no dejar la pantalla girando para
       * siempre si el worker muere: al agotarse se recarga igual, así el cliente ve el estado
       * REAL de su carga en vez de una promesa que no se cumplió.
       */
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const d = await cargar();
        if (d && d.status !== 'processing') {
          setDatos(d);
          break;
        }
      }
      setReprocesando(null);
      setAbierta(null);
      const final = await cargar();
      if (final) setDatos(final);
    },
    [documentId, cargar],
  );

  const alternar = useCallback((hoja: string) => {
    setExcluidas((previo) => {
      const siguiente = new Set(previo);
      if (siguiente.has(hoja)) siguiente.delete(hoja);
      else siguiente.add(hoja);
      return siguiente;
    });
  }, []);

  async function publicar() {
    setPublicando(true);
    setError(false);
    const r = await request<{ confirmado: boolean }>(`/api/documents/${documentId}/confirmar`, {
      method: 'POST',
      body: JSON.stringify({
        excluir: [...excluidas],
        reclasificar: Object.entries(reclasificadas).map(([hoja, type]) => ({ hoja, type })),
      }),
    });
    setPublicando(false);
    if (!r.ok) {
      setError(true);
      return;
    }
    setListo(true);
    onPublicado?.();
  }

  if (datos === undefined) return <p className="text-body text-faint">{common.loading}</p>;
  if (datos === null) return null;
  // Ya confirmada: esta pantalla no tiene nada que pedir. El resumen sigue disponible aparte.
  if (datos.confirmedAt !== null && !listo) return null;

  const detalle = datos.detalle ?? {};
  const usadas = datos.hojas.filter((h) => h.estado !== 'descartada');
  /*
   * ═══ UNA PORTADA NO ES UN DESCARTE QUE HAYA QUE DEFENDER ═══
   *
   * Un libro real trae `Portada`, `Notas`, `Instrucciones`. Listadas una por una entre las
   * hojas descartadas ocupan media pantalla y hacen parecer que descartamos medio archivo,
   * cuando lo que descartamos es la carátula. El dueño no puede desmentir eso —no hay cifra
   * que contrastar— y el ruido le tapa el descarte que SÍ tiene que mirar, que es el que se
   * llevó dinero.
   *
   * El corte es por DINERO y no por el nombre de la hoja: "Portada" es una convención y el
   * próximo cliente la llamará "Carátula". Una hoja sin un solo monto medido no tiene nada
   * que el dueño pueda desmentir; una con Q 2.707.318 va arriba, entera y con su motivo.
   */
  const sinDinero = (h: HojaResumen) => (h.montos ?? []).every((m) => m.total === 0);
  const descartadas = datos.hojas.filter((h) => h.estado === 'descartada' && !sinDinero(h));
  const vacias = datos.hojas.filter((h) => h.estado === 'descartada' && sinDinero(h));

  return (
    <div className="flex flex-col gap-0 whitespace-normal rounded-2xl border border-border bg-card px-[30px] py-[26px] shadow-sm">
      <p className="font-mono text-eyebrow uppercase tracking-wide text-warning">
        {labels.eyebrow}
      </p>
      <div className="mt-1.5 flex items-center gap-3.5">
        <InsightPoint size="md" className="shrink-0" />
        <p className="text-[18px] font-bold leading-tight">{labels.title}</p>
      </div>
      <p className="ml-[52px] mt-0.5 text-body text-muted-foreground">{labels.subtitle}</p>

      {listo ? (
        <p className="mt-5 text-body text-success">{labels.publicado}</p>
      ) : (
        <>
          <p className="mb-2 mt-6 font-mono text-eyebrow uppercase tracking-wide text-faint">
            {labels.sheetsTitle}
          </p>
          <ul className="flex flex-col gap-1.5">
            {usadas.map((h) => {
              const fuera = excluidas.has(h.nombre);
              return (
                <li
                  key={h.nombre}
                  className={cn(
                    'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3.5 py-2.5',
                    fuera ? 'bg-muted' : 'bg-brand-soft',
                  )}
                >
                  {fuera ? (
                    <X className="h-3.5 w-3.5 shrink-0 text-faint" strokeWidth={2} />
                  ) : (
                    <Check className="h-3.5 w-3.5 shrink-0 text-brand-ink" strokeWidth={2} />
                  )}
                  <span
                    className={cn('text-body font-semibold', fuera && 'line-through opacity-60')}
                  >
                    {h.nombre}
                  </span>
                  <span className="font-mono text-delta tabular-nums text-muted-foreground">
                    {fuera
                      ? labels.excluida
                      : h.estado === 'inventario'
                        ? labels.inventario
                        : (() => {
                            /*
                            ⚠️ UNA CARÁTULA NO PRODUJO "3 MOVIMIENTOS" (2026-09-01).

                            Medido en producción: `Portada` y `Notas` se listaban como
                            "3 movimientos · —" entre las hojas que sí cuentan. Llamar
                            MOVIMIENTOS a tres renglones de una carátula es la pantalla
                            afirmando algo que no pasó, justo donde el dueño decide si
                            publicar.

                            Y NO se agrupan como las descartadas sin dinero: una hoja que
                            produjo filas va a publicar algo, así que esconderla contradiría
                            el portón. Lo que estaba mal era el texto. Ver `usadaSinMonto`.
                          */
                            const monto = (h.montos ?? [])
                              .map((m) => dinero(m.total, m.moneda, locale))
                              .join(' + ');
                            const filas = formatNumber(h.filas ?? 0, locale);
                            return monto
                              ? labels.usada.replace('{n}', filas).replace('{monto}', monto)
                              : labels.usadaSinMonto.replace('{n}', filas);
                          })()}
                  </span>
                  {/*
                    Solo se puede desconocer una hoja que SÍ estamos usando. Ofrecer "excluir"
                    sobre una que ya descartamos sería un control que no hace nada.
                  */}
                  {h.estado !== 'inventario' && (
                    <button
                      type="button"
                      onClick={() => alternar(h.nombre)}
                      className="ml-auto shrink-0 text-body text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      {fuera ? labels.deshacer : labels.excluir}
                    </button>
                  )}

                  {/*
                    VER QUÉ ENTENDIMOS. Aprobar un nombre y un total alcanza para detectar una
                    hoja de más o de menos; NO alcanza para leer la columna equivocada, donde el
                    total se ve perfecto y cada fila está mal. Por eso el panel muestra de DÓNDE
                    salió cada dato y tres filas como quedaron.
                  */}
                  {h.estado === 'movimientos' && (
                    <button
                      type="button"
                      onClick={() => setAbierta(abierta === h.nombre ? null : h.nombre)}
                      aria-expanded={abierta === h.nombre}
                      className="flex w-full items-center gap-1 text-body text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      <ChevronRight
                        className={cn(
                          'h-3.5 w-3.5 shrink-0 transition-transform',
                          abierta === h.nombre && 'rotate-90',
                        )}
                        strokeWidth={1.7}
                      />
                      {abierta === h.nombre ? labels.ocultarDetalle : labels.verDetalle}
                    </button>
                  )}

                  {abierta === h.nombre && (
                    <div className="w-full border-t border-border pt-3">
                      {/* De dónde salió cada dato. Es lo que delata un mapa de columnas corrido. */}
                      {h.columnas && Object.keys(h.columnas).length > 0 && (
                        <>
                          <p className="mb-1.5 font-mono text-eyebrow uppercase tracking-wide text-faint">
                            {labels.comoLeimos}
                          </p>
                          <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1">
                            {Object.entries(h.columnas).map(([campo, col]) => (
                              <li key={campo} className="text-micro text-muted-foreground">
                                {campo}: <span className="font-mono text-foreground">{col}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}

                      <p className="mb-1.5 font-mono text-eyebrow uppercase tracking-wide text-faint">
                        {labels.primerasFilas}
                      </p>
                      {(detalle[h.nombre]?.muestra ?? []).length === 0 ? (
                        <p className="mb-4 text-micro text-muted-foreground">{labels.sinMuestra}</p>
                      ) : (
                        <ul className="mb-4 flex flex-col gap-1">
                          {(detalle[h.nombre]?.muestra ?? []).map((f, i) => (
                            <li
                              key={i}
                              className="flex flex-wrap items-baseline gap-x-3 font-mono text-micro tabular-nums"
                            >
                              <span className="text-muted-foreground">{f.fecha ?? '—'}</span>
                              <span className="font-sans text-foreground">{f.concepto ?? '—'}</span>
                              <span className="text-foreground">
                                {f.monto !== null && f.moneda
                                  ? dinero(f.monto, f.moneda, locale)
                                  : '—'}
                              </span>
                              <span className="text-muted-foreground">{f.categoria ?? f.tipo}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/*
                        ⚠️ DE QUÉ COLUMNA SALE EL MONTO (migración 0043).

                        Enseñarle al dueño que el monto salió de «Precio Unitario» sin darle
                        dónde elegir «Total» lo deja mirando el error sin salida — y es el
                        fallo que `sheet-header` describe como el peor de su clase: no falla
                        nada visible, el total puede verse perfecto y cada fila estar mal.

                        Solo el MONTO, y es decisión: es la columna que mueve la cifra del
                        dashboard, y un formulario con las doce del mapa convertiría una
                        corrección en una tarea. Cambiarla reprocesa la hoja.
                      */}
                      {(h.encabezados ?? []).length > 0 && (
                        <div className="mb-4">
                          <p className="mb-1.5 font-mono text-eyebrow uppercase tracking-wide text-faint">
                            {labels.columnaCorrecta}
                          </p>
                          <p className="mb-2 text-micro text-muted-foreground">
                            {labels.columnaHint}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(h.encabezados ?? []).map((nombre, idx) => {
                              const actual = h.columnas?.monto === (nombre || `columna ${idx + 1}`);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  disabled={reprocesando !== null}
                                  onClick={() =>
                                    void corregirHoja(h.nombre, { columnas: { amount: idx } })
                                  }
                                  className={cn(
                                    'rounded-lg border-[1.5px] px-3 py-1.5 text-micro font-semibold disabled:opacity-50',
                                    actual
                                      ? 'border-brand-ink bg-brand-soft text-brand-ink'
                                      : 'border-border text-muted-foreground hover:border-brand-bd',
                                  )}
                                >
                                  {nombre || `columna ${idx + 1}`}
                                </button>
                              );
                            })}
                          </div>
                          {reprocesando === h.nombre && (
                            <p className="mt-2 text-micro text-brand-ink">{labels.reprocesando}</p>
                          )}
                        </div>
                      )}

                      {/*
                        CORREGIR LA HOJA ENTERA. Una hoja es homogénea por construcción, así que
                        preguntar concepto por concepto lo que el dueño dice de un golpe
                        convertiría una decisión en un formulario.
                      */}
                      <p className="mb-1.5 font-mono text-eyebrow uppercase tracking-wide text-faint">
                        {labels.corregir}
                      </p>
                      <p className="mb-2 text-micro text-muted-foreground">
                        {labels.corregirHint.replace('{n}', formatNumber(h.filas ?? 0, locale))}
                      </p>
                      <div
                        role="radiogroup"
                        aria-label={labels.corregir}
                        className="flex flex-wrap gap-2"
                      >
                        {TIPOS.map((t) => {
                          const actual =
                            reclasificadas[h.nombre] ?? tipoDominante(detalle[h.nombre]);
                          return (
                            <button
                              key={t}
                              type="button"
                              role="radio"
                              aria-checked={actual === t}
                              onClick={() => setReclasificadas((p) => ({ ...p, [h.nombre]: t }))}
                              className={cn(
                                'rounded-lg border-[1.5px] px-3 py-1.5 text-micro font-semibold',
                                actual === t
                                  ? 'border-brand-ink bg-brand-soft text-brand-ink'
                                  : 'border-border text-muted-foreground hover:border-brand-bd',
                              )}
                            >
                              {conceptosLabels.type[t]}
                            </button>
                          );
                        })}
                      </div>
                      {reclasificadas[h.nombre] && (
                        <p className="mt-2 text-micro text-brand-ink">
                          {labels.corregirAplicado.replace(
                            '{tipo}',
                            conceptosLabels.type[
                              reclasificadas[h.nombre] as keyof typeof conceptosLabels.type
                            ],
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}

            {descartadas.map((h) => (
              <li
                key={h.nombre}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-muted px-3.5 py-2.5"
              >
                <X className="h-3.5 w-3.5 shrink-0 text-faint" strokeWidth={2} />
                <span className="text-body font-semibold text-muted-foreground">{h.nombre}</span>
                <span className="text-micro text-muted-foreground">
                  {labels.noUsada}
                  {h.motivo
                    ? ` ${reasonLabels[h.motivo].replace('{n}', formatNumber(h.filas ?? 0, locale))}`
                    : ''}
                </span>
                {/*
                  El dinero que se quedó afuera. Es lo único que le permite al dueño desmentir
                  un descarte: "no se leyó: 220 filas" no le dice nada, "Q 2.707.318 porque
                  repite el dinero de otra hoja" se contesta de un vistazo.
                */}
                {h.montos && h.montos.length > 0 && (
                  <span className="font-mono text-delta tabular-nums text-warning">
                    {h.montos.map((m) => dinero(m.total, m.moneda, locale)).join(' + ')}
                  </span>
                )}
                {/*
                  ⚠️ LA SALIDA QUE FALTABA (migración 0043).

                  Perder una hoja en silencio es el fallo más caro que tiene esta ingesta —el
                  dashboard de KapePrueba en cero con la contabilidad bien leída, la cartera de
                  clientes que el filtro de catálogo se llevó puesta—. Hasta hoy esta pantalla
                  se lo MOSTRABA al dueño y no le daba nada que apretar.

                  Reprocesa el archivo saltándose los filtros SOLO para esta hoja, así que no
                  es un cambio local como excluir: hay que esperar al worker.
                */}
                <button
                  type="button"
                  disabled={reprocesando !== null}
                  onClick={() => void corregirHoja(h.nombre, { forzar: true })}
                  className="ml-auto shrink-0 text-body text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:no-underline disabled:opacity-50"
                >
                  {reprocesando === h.nombre ? labels.reprocesando : labels.siCuenta}
                </button>
              </li>
            ))}

            {/*
              Las hojas sin un solo monto medido, juntas y colapsadas. Ver `sinDinero` arriba:
              el corte es por dinero y no por nombre, porque "Portada" es una convención.
            */}
            {vacias.length > 0 && (
              <li className="rounded-lg bg-muted px-3.5 py-2.5">
                <button
                  type="button"
                  onClick={() => setVerSinDatos((v) => !v)}
                  aria-expanded={verSinDatos}
                  className="flex items-center gap-1.5 text-micro text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  <ChevronRight
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 transition-transform',
                      verSinDatos && 'rotate-90',
                    )}
                    strokeWidth={1.7}
                  />
                  {labels.sinDatos.replace('{n}', formatNumber(vacias.length, locale))}
                </button>
                {verSinDatos && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {vacias.map((h) => (
                      <li
                        key={h.nombre}
                        className="flex flex-wrap items-center gap-x-3 text-micro text-muted-foreground"
                      >
                        <span className="font-semibold">{h.nombre}</span>
                        <span>
                          {h.motivo
                            ? reasonLabels[h.motivo].replace(
                                '{n}',
                                formatNumber(h.filas ?? 0, locale),
                              )
                            : ''}
                        </span>
                        {/* También se pueden rescatar: que no midiéramos dinero no prueba que no lo traiga. */}
                        <button
                          type="button"
                          disabled={reprocesando !== null}
                          onClick={() => void corregirHoja(h.nombre, { forzar: true })}
                          className="underline underline-offset-2 hover:text-foreground disabled:no-underline disabled:opacity-50"
                        >
                          {reprocesando === h.nombre ? labels.reprocesando : labels.siCuenta}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )}
          </ul>

          {datos.marcadas > 0 && (
            <div className="mt-6">
              <p className="mb-2 font-mono text-eyebrow uppercase tracking-wide text-faint">
                {labels.conceptosTitle}
              </p>
              {/*
                ⚠️ SIN NÚMERO, y ese es el arreglo. Decía "Quedaron {n} conceptos" con `n` =
                FILAS MARCADAS, y el panel de abajo —que cuenta CONCEPTOS contestables— decía
                otra cosa sobre la misma carga: medido en producción, 30 arriba contra 4 abajo.
                Es el mismo fallo que `conceptos-pendientes` documenta del lado del correo, y
                encima llamaba "conceptos" a las filas. El único conteo que vale lo da el panel.
              */}
              <p className="mb-2 text-body text-muted-foreground">{labels.conceptosHint}</p>
              {/*
                El panel de conceptos, tal cual. No se reimplementa: es el mismo contrato y el
                mismo endpoint, y dos versiones del mismo formulario se separan.
              */}
              <ConceptosPendientes
                documentId={documentId}
                labels={conceptosLabels}
                common={common}
                locale={locale}
                abrirAlMontar
              />
            </div>
          )}

          {error && <p className="mt-4 text-body text-danger">{labels.error}</p>}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {confirmando ? (
              <div className="flex w-full flex-col gap-2 rounded-lg border border-warning-bd bg-warning-bg px-3.5 py-3">
                <p className="text-body font-semibold">{labels.confirmarTitulo}</p>
                <p className="text-body text-muted-foreground">
                  {(excluidas.size > 0
                    ? labels.confirmarDetalleConExcluidas
                    : labels.confirmarDetalle
                  )
                    .replace('{n}', formatNumber(usadas.length - excluidas.size, locale))
                    .replace('{x}', formatNumber(excluidas.size, locale))}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <Button
                    size="sm"
                    className="rounded-lg px-[22px] py-2.5"
                    disabled={publicando}
                    onClick={() => void publicar()}
                  >
                    {publicando ? labels.publicando : labels.confirmarSi}
                  </Button>
                  {/* La salida. Sin esto el paso sería un obstáculo, no una red. */}
                  <button
                    type="button"
                    onClick={() => setConfirmando(false)}
                    className="flex items-center gap-1 text-body text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                    {labels.volver}
                  </button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                className="rounded-lg px-[22px] py-2.5"
                disabled={publicando}
                onClick={() => setConfirmando(true)}
              >
                {labels.publicar}
              </Button>
            )}
            {/*
              Se puede publicar SIN contestar los conceptos: sus filas quedan retenidas y el
              resto entra. Obligar a contestarlas convertiría el portón en un trámite bloqueante,
              que es la forma exacta que dejó 0 filas en producción antes de la migración 0020.
            */}
            <span className="text-micro text-muted-foreground">{labels.pendiente}</span>
          </div>
        </>
      )}
    </div>
  );
}
