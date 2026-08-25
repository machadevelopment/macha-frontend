'use client';

import { useState } from 'react';
import { ChevronRight, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/cn';
import { request } from '@/lib/api/browser';
import { formatMoney, formatNumber } from '@/lib/format';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * "Qué entendimos de tu archivo" (CU-868krmrcj).
 *
 * ═══ POR QUÉ ESTA PANTALLA ES EL ARREGLO, Y NO UNA RESTRICCIÓN DE CARGAS ═══
 *
 * El ticket pedía impedir que el cliente subiera archivos que no calzaran con su perfil. Eso
 * ataca el modo de fallo menos dañino —el rechazo, que al menos es visible— y crea uno nuevo:
 * bloquear archivos legítimos.
 *
 * Los dos que de verdad hacen daño son SILENCIOSOS:
 *
 *   · Leer el monto de la columna equivocada. Números plausibles, cero errores. En una
 *     herramienta de CFO es lo que destruye la confianza, porque cuando se descubre ya no se
 *     sabe qué otras cifras estaban mal.
 *   · Descartar hojas sin decirlo. El pre-filtro se come ~50 % de las filas de cada archivo.
 *     La hoja de inventario se tiró durante MESES en tres empresas y nadie lo supo hasta que
 *     un cliente preguntó por qué su inventario estaba vacío.
 *
 * Ninguna restricción arregla eso. Enseñarlo, sí: en cuanto la fila dice
 * «monto → "Precio Unitario (Q)"», el dueño responde "esa no es, esa es lo que cobro". Un
 * error que antes era indetectable pasa a saltar a la vista de quien SÍ conoce su archivo.
 *
 * ═══ SE PIDE AL EXPANDIR, NO EN LA LISTA ═══
 *
 * El detalle vive en `GET /documents/:id`, no en el listado, y eso es a propósito del lado del
 * backend: esa lista se re-consulta cada 4 s mientras hay cargas en vuelo, y mandar el resumen
 * completo de cada documento en cada poll sería pagar ancho de banda por algo que casi nadie
 * mira. Acá se pide una vez y se queda.
 */

interface HojaMovimientos {
  estado: 'movimientos';
  nombre: string;
  filas: number;
  columnas: Record<string, string | null>;
  /**
   * Cuánto dinero traía la hoja, por moneda. Opcional: las cargas anteriores al 2026-08-25 no
   * lo traen, y ausente NO es cero — es "esta carga es anterior a la medición".
   */
  montos?: MontoPorMoneda[];
  costos?: MontoPorMoneda[];
}

/** Nunca se suman dos monedas: el total mezclado no sería ninguna de las dos. */
interface MontoPorMoneda {
  moneda: string;
  total: number;
  filas: number;
}

/**
 * La moneda la escribe el ARCHIVO del cliente, así que puede no ser una de las dos que el
 * producto formatea. `formatMoney` solo conoce GTQ y USD, y castearle un `'EUR'` a la fuerza
 * lo haría pintar un símbolo equivocado sobre una cifra real — peor que no formatear.
 *
 * Cuando no la conocemos se muestra el código tal cual vino y el número con separadores. El
 * cliente ve su cifra y ve que trae una moneda que todavía no manejamos, que es exactamente lo
 * que necesita saber.
 */
export function dinero(total: number, moneda: string, locale: Locale): string {
  return moneda === 'GTQ' || moneda === 'USD'
    ? formatMoney(total, moneda, locale)
    : `${moneda} ${formatNumber(total, locale)}`;
}
interface HojaInventario {
  estado: 'inventario';
  nombre: string;
  creados: number;
  ajustados: number;
  sinCambio: number;
  omitidas: number;
}
interface HojaDescartada {
  estado: 'descartada';
  nombre: string;
  motivo: 'catalogo' | 'reporte' | 'duplica_otra_hoja' | 'ya_ingerida' | 'vacia';
  filas: number;
}
type Hoja = HojaMovimientos | HojaInventario | HojaDescartada;

interface Resumen {
  hojas: Hoja[];
  totales: { movimientos: number; descartadas: number; yaIngeridas: number };
}

interface Detalle {
  readSummary: Resumen | null;
}

export function ReadSummary({
  documentId,
  labels,
  common,
  locale,
}: {
  documentId: string;
  labels: Dictionary['upload']['readSummary'];
  common: Dictionary['common'];
  locale: Locale;
}) {
  const [abierto, setAbierto] = useState(false);
  const [resumen, setResumen] = useState<Resumen | null | undefined>(undefined);
  const [error, setError] = useState(false);

  async function alternar() {
    const siguiente = !abierto;
    setAbierto(siguiente);
    // Se pide UNA vez. Un documento ya procesado no cambia su resumen, así que volver a
    // pedirlo al cerrar y abrir sería una petición por cada clic de curiosidad.
    if (!siguiente || resumen !== undefined) return;

    const result = await request<Detalle>(`/api/documents/${documentId}`);
    if (!result.ok) {
      setError(true);
      return;
    }
    setResumen(result.data.readSummary);
  }

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
        {labels.cta}
      </button>

      {abierto && (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-muted px-3 py-2.5">
          {error && <p className="text-body text-danger">{common.loadError.server}</p>}

          {/*
            `undefined` = todavía cargando · `null` = el documento no tiene resumen.
            Se distinguen porque significan cosas distintas: lo segundo pasa con cargas
            anteriores a esta función o que nunca llegaron a procesarse, y decirlo es más
            honesto que dejar un panel vacío que parece roto.
          */}
          {!error && resumen === undefined && (
            <p className="text-body text-faint" aria-busy="true">
              {common.loading}
            </p>
          )}
          {!error && resumen === null && <p className="text-body text-faint">{labels.empty}</p>}

          {resumen && (
            <>
              {resumen.hojas.map((hoja) => (
                <div key={hoja.nombre} className="flex flex-col gap-1">
                  <p className="flex items-center gap-1.5 text-body">
                    <FileSpreadsheet
                      className="h-3.5 w-3.5 shrink-0 text-faint"
                      strokeWidth={1.7}
                    />
                    <span className="font-medium">{hoja.nombre}</span>
                    <span className="text-faint">
                      {hoja.estado === 'movimientos' &&
                        labels.sheetMovements.replace('{n}', formatNumber(hoja.filas, locale))}
                      {hoja.estado === 'inventario' &&
                        labels.sheetInventory
                          .replace('{creados}', formatNumber(hoja.creados, locale))
                          .replace('{ajustados}', formatNumber(hoja.ajustados, locale))}
                      {hoja.estado === 'descartada' &&
                        labels.reason[hoja.motivo].replace('{n}', formatNumber(hoja.filas, locale))}
                    </span>
                  </p>

                  {/*
                    CUÁNTO DINERO TRAÍA LA HOJA — la cifra que el dueño reconoce o desmiente.

                    Va ARRIBA del mapeo de columnas y en grande porque es lo único del resumen
                    que se contesta sin pensar: son sus ventas, las conoce. Un cliente subió 19
                    meses y el dashboard le abrió en "este mes"; las cifras estaban bien al
                    quetzal y aun así reportó que no tenían "nada que ver con el Excel", porque
                    no había dónde comprobarlo.

                    Una línea por moneda, nunca sumadas: en esta etapa las filas todavía no
                    tienen monto convertido, así que un total mezclado no sería ninguna de las
                    dos monedas.
                  */}
                  {hoja.estado === 'movimientos' && hoja.montos && hoja.montos.length > 0 && (
                    <div className="ml-5 flex flex-col gap-0.5">
                      {hoja.montos.map((m) => (
                        <p
                          key={m.moneda}
                          className="font-mono text-body tabular-nums text-foreground"
                        >
                          {dinero(m.total, m.moneda, locale)}
                        </p>
                      ))}
                      {hoja.costos?.map((c) => (
                        <p key={c.moneda} className="text-micro text-faint">
                          {labels.sheetCost.replace('{monto}', dinero(c.total, c.moneda, locale))}
                        </p>
                      ))}
                    </div>
                  )}

                  {/*
                    EL MAPEO DE COLUMNAS ES LA PARTE QUE IMPORTA. Todo lo demás del resumen es
                    contexto; esto es lo único que le permite al dueño detectar que leímos la
                    columna equivocada, que es el fallo que ninguna otra pantalla revela.
                  */}
                  {hoja.estado === 'movimientos' && Object.keys(hoja.columnas).length > 0 && (
                    <dl className="ml-5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-body">
                      {Object.entries(hoja.columnas).map(([campo, columna]) => (
                        <div key={campo} className="contents">
                          <dt className="text-faint">{campo}</dt>
                          <dd className="truncate text-muted-foreground">{columna}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              ))}

              {/*
                Los totales van al final y en `tabular-nums`: son el número que el cliente va a
                querer cuadrar contra su propio archivo, y para eso tienen que alinearse.
              */}
              <p className="border-t border-border pt-2 text-body tabular-nums text-faint">
                {labels.totals
                  .replace('{movimientos}', formatNumber(resumen.totales.movimientos, locale))
                  .replace('{descartadas}', formatNumber(resumen.totales.descartadas, locale))}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
