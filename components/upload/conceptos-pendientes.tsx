'use client';

import { useState } from 'react';
import { ChevronRight, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { request } from '@/lib/api/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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
 */
function montosLegibles(montos: Concepto['montos'], locale: Locale): string {
  return montos
    .filter(
      (m): m is { currency: Moneda; total: number } => m.currency === 'GTQ' || m.currency === 'USD',
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
}: {
  documentId: string;
  labels: Dictionary['upload']['conceptos'];
  common: Dictionary['common'];
  locale: Locale;
  /** Para que la lista de cargas refresque su conteo de filas marcadas. */
  onResuelto?: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [conceptos, setConceptos] = useState<Concepto[] | undefined>(undefined);
  const [respuestas, setRespuestas] = useState<Respuestas>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(false);
  const [resueltas, setResueltas] = useState<number | null>(null);

  async function alternar() {
    const siguiente = !abierto;
    setAbierto(siguiente);
    if (!siguiente || conceptos !== undefined) return;

    const r = await request<{ conceptos: Concepto[] }>(
      `/api/documents/${documentId}/conceptos-pendientes`,
    );
    if (!r.ok) {
      setError(true);
      return;
    }
    setConceptos(r.data.conceptos);
  }

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

  const pendientes = conceptos?.length ?? 0;

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
        {labels.cta.replace('{n}', formatNumber(pendientes, locale))}
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

          {conceptos && conceptos.length > 0 && (
            <>
              <div className="flex flex-col gap-0.5">
                <p className="text-body font-medium">{labels.title}</p>
                <p className="text-micro text-muted-foreground">{labels.subtitle}</p>
              </div>

              {conceptos.map((c) => (
                <div
                  key={c.concepto}
                  className="flex min-w-0 flex-col gap-1.5 border-t border-border pt-2.5"
                >
                  <div className="flex min-w-0 flex-col">
                    {/*
                      `break-words` y no `truncate`: la descripción de una fila real puede ser
                      larga, y recortarla es justo lo que le quita al cliente la información
                      con la que reconoce su propio concepto.
                    */}
                    <p className="break-words text-body font-medium">{c.ejemplo}</p>
                    <p className="font-mono text-micro tabular-nums text-faint">
                      {labels.rows
                        .replace('{n}', formatNumber(c.filas, locale))
                        .replace('{monto}', montosLegibles(c.montos, locale))}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <label className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-micro text-faint">{labels.typeLabel}</span>
                      <Select
                        value={respuestas[c.concepto]?.type ?? 'opex'}
                        onChange={(e) =>
                          actualizar(c.concepto, { type: e.target.value as TipoDeMovimiento })
                        }
                      >
                        {TIPOS.map((t) => (
                          <option key={t} value={t}>
                            {labels.type[t]}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-micro text-faint">{labels.categoryLabel}</span>
                      <Input
                        value={respuestas[c.concepto]?.category ?? ''}
                        onChange={(e) => actualizar(c.concepto, { category: e.target.value })}
                        placeholder={labels.categoryPlaceholder}
                        maxLength={80}
                      />
                    </label>
                  </div>
                </div>
              ))}

              {/*
                Deshabilitado mientras no haya al menos un rubro escrito. Un botón activo que no
                hace nada es peor que uno apagado: el cliente aprieta, no pasa nada visible, y
                concluye que la pantalla está rota.
              */}
              <Button
                size="sm"
                className="self-start"
                disabled={guardando || listas.length === 0}
                onClick={() => void guardar()}
              >
                {guardando ? labels.submitting : labels.submit}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
