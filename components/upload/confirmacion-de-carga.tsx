'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronLeft, X } from 'lucide-react';
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
  estado: 'movimientos' | 'inventario' | 'descartada';
  filas?: number;
  motivo?: keyof Dictionary['upload']['readSummary']['reason'];
  montos?: MontoPorMoneda[];
}

interface Confirmacion {
  documentId: string;
  status: string;
  confirmedAt: string | null;
  filas: number;
  marcadas: number;
  hojas: HojaResumen[];
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

  useEffect(() => {
    let vivo = true;
    void request<Confirmacion>(`/api/documents/${documentId}/confirmacion`).then((r) => {
      if (!vivo) return;
      setDatos(r.ok ? r.data : null);
    });
    return () => {
      vivo = false;
    };
  }, [documentId]);

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
      body: JSON.stringify({ excluir: [...excluidas] }),
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

  const usadas = datos.hojas.filter((h) => h.estado !== 'descartada');
  const descartadas = datos.hojas.filter((h) => h.estado === 'descartada');

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
                        : labels.usada
                            .replace('{n}', formatNumber(h.filas ?? 0, locale))
                            .replace(
                              '{monto}',
                              (h.montos ?? [])
                                .map((m) => dinero(m.total, m.moneda, locale))
                                .join(' + ') || '—',
                            )}
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
              </li>
            ))}
          </ul>

          {datos.marcadas > 0 && (
            <div className="mt-6">
              <p className="mb-2 font-mono text-eyebrow uppercase tracking-wide text-faint">
                {labels.conceptosTitle}
              </p>
              <p className="mb-2 text-body text-muted-foreground">
                {labels.conceptosHint.replace('{n}', formatNumber(datos.marcadas, locale))}
              </p>
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
