'use client';

import { CalendarOff } from 'lucide-react';
import { formatDate } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { PeriodMetricsResponse, PeriodTotals } from '@/lib/api/dashboard';

/**
 * ═══ UN CERO QUE SE EXPLICA (CU-868krn2up) ═══
 *
 * Macha reportó: "la data de la empresa importada solo aparece en Este año; por mes, semana
 * o día no aparece". Las capturas muestran el filtro anual con Q 101.380 y el mensual en
 * Q 0,00 con un delta rojo de −100 %.
 *
 * El backend no tiene ningún camino especial para el año: los cuatro filtros consultan el
 * mismo ledger con la misma función. Lo que pasa es que la contabilidad que subió el cliente
 * no llega hasta el mes en curso, así que en agosto no había nada que sumar.
 *
 * Y AUN ASÍ ES UN BUG, aunque el número sea correcto. "Q 0,00" con "−100 % vs. período
 * anterior" es literalmente lo que la pantalla mostraría si el negocio hubiera dejado de
 * vender. Con la cifra anual al lado diciendo lo contrario, la única lectura disponible era
 * "esto está roto". Un cero sin explicación y un fallo se ven igual, y esa ambigüedad es lo
 * que se arregla acá — no el cálculo.
 *
 * TRES ESTADOS, NO DOS. "Sin datos" no es una sola cosa:
 *
 *   · Hay datos, pero en otras fechas → se dice cuáles, que es la frase que cierra la
 *     pregunta y le dice al dueño qué filtro tocar.
 *   · No hay datos en toda la cuenta → no hay rango que ofrecer; lo que corresponde es
 *     mandar a subir un archivo.
 *   · Hay datos en este período → no se dice nada. El aviso solo aparece cuando el vacío
 *     necesita explicación; si sale siempre, deja de leerse.
 *
 * NO PISA AL `IngestStatusBanner`. Aquel contesta "subí un archivo hace un rato y no veo
 * nada" (está en cola, o quedó en revisión); este contesta "hay datos pero no en el período
 * que estoy mirando". Son dos causas distintas del mismo cero y pueden convivir.
 */

export const enCero = (t: PeriodTotals): boolean =>
  t.revenue === 0 && t.cogs === 0 && t.opex === 0 && t.other === 0;

export function PeriodEmptyNote({
  data,
  locale,
  labels,
}: {
  data: PeriodMetricsResponse;
  locale: Locale;
  labels: Dictionary['dashboard']['emptyPeriod'];
}) {
  if (!enCero(data.current)) return null;

  /*
   * Se compara contra `dataRange` y no se asume que "hay datos en otro lado" solo porque
   * `previous` traiga algo: la ventana anterior es del mismo tamaño y está pegada, así que
   * también puede estar vacía mientras el resto del año no lo está — que es justo el caso
   * de la captura (agosto y julio en cero, el año con Q 101.380).
   */
  const texto =
    data.dataRange === null
      ? labels.noDataAtAll
      : labels.outsideRange
          .replace('{from}', formatDate(data.dataRange.from, locale))
          .replace('{to}', formatDate(data.dataRange.to, locale));

  return (
    /*
     * Neutro a propósito: no lleva color de estado. Esto no es un error ni una alarma — es
     * una explicación. Pintarlo de rojo o de ámbar diría "algo salió mal" sobre una cuenta
     * que está perfectamente sana, que es la mitad del malentendido que vino a resolver.
     */
    <p className="flex items-start gap-2 rounded-md border border-border bg-muted px-3 py-2 text-body text-muted-foreground">
      <CalendarOff className="mt-0.5 h-4 w-4 shrink-0 text-faint" strokeWidth={1.7} />
      <span>{texto}</span>
    </p>
  );
}
