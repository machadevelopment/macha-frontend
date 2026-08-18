/**
 * Rangos del filtro de período del dashboard.
 *
 * Funciones puras y sin reloj propio —reciben el "hoy"— para que sean comprobables sin
 * congelar el tiempo global y para que el llamador sea dueño explícito del instante.
 *
 * Todo se calcula en la fecha LOCAL del usuario, no en UTC. Un dueño en Guatemala
 * (UTC-6) que abre el dashboard a las 8 de la noche está en el día siguiente según UTC:
 * con "hoy" en UTC vería el rango equivocado durante seis horas cada día, y las cifras
 * no cuadrarían con lo que vendió.
 */

/**
 * CU-868kt2aga: se agregan `quarter` y `lastMonth`.
 *
 * `quarter` porque el prototipo lo lista entre los períodos rápidos y no existía — el
 * trimestre es la unidad con la que una PYME habla con su contador y con el banco.
 *
 * `lastMonth` porque es el rango que más se pide y el único que HOY obligaba a abrir el
 * calendario y teclear dos fechas: "¿cómo me fue el mes pasado?" es la pregunta más común
 * del dashboard, y estaba a cuatro interacciones de distancia.
 */
export type PeriodKey = 'today' | 'week' | 'month' | 'lastMonth' | 'quarter' | 'year' | 'custom';

export interface DateRange {
  from: string;
  to: string;
}

/**
 * `YYYY-MM-DD` en fecha LOCAL. Exportada desde CU-868knx137: el rango personalizado
 * necesita saber cuál es "hoy" en el mismo formato para poder rechazar fechas futuras.
 *
 * `toISOString()` convierte a UTC y correría la fecha; se arma a mano desde los
 * componentes locales.
 */
export const localIsoDate = (d: Date): string => {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};

const iso = localIsoDate;

export function computeRange(key: Exclude<PeriodKey, 'custom'>, hoy: Date): DateRange {
  const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  switch (key) {
    case 'today':
      return { from: iso(d), to: iso(d) };
    case 'week': {
      // Semana de LUNES a domingo: es la convención en Guatemala y en es-GT. Con domingo
      // como primer día, el lunes de trabajo aparecería en la semana anterior.
      const diaSemana = (d.getDay() + 6) % 7; // 0 = lunes
      const lunes = new Date(d);
      lunes.setDate(d.getDate() - diaSemana);
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      return { from: iso(lunes), to: iso(domingo) };
    }
    case 'month':
      return {
        from: iso(new Date(d.getFullYear(), d.getMonth(), 1)),
        // Día 0 del mes siguiente = último día de este. Evita la tabla de 30/31/28/29.
        to: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
      };
    case 'lastMonth':
      // Día 0 del mes actual = último día del anterior. Misma técnica que `month`, y por
      // la misma razón: evita la tabla de 30/31/28/29 y el 29 de febrero.
      return {
        from: iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)),
        to: iso(new Date(d.getFullYear(), d.getMonth(), 0)),
      };
    case 'quarter': {
      // Trimestre CALENDARIO (ene-mar, abr-jun, jul-sep, oct-dic), no los últimos tres
      // meses: es el que usa el contador y el que espera el banco. `Math.floor(mes/3)*3`
      // da el primer mes del trimestre en curso.
      const primerMes = Math.floor(d.getMonth() / 3) * 3;
      return {
        from: iso(new Date(d.getFullYear(), primerMes, 1)),
        to: iso(new Date(d.getFullYear(), primerMes + 3, 0)),
      };
    }
    case 'year':
      return {
        from: iso(new Date(d.getFullYear(), 0, 1)),
        to: iso(new Date(d.getFullYear(), 11, 31)),
      };
  }
}

/** Motivo por el que un rango personalizado no se puede aplicar. `null` = está bien. */
export type CustomRangeError = 'incomplete' | 'reversed' | 'future';

/**
 * Valida el rango personalizado (CU-868knx137).
 *
 * Compara los `YYYY-MM-DD` COMO TEXTO, sin construir un solo `Date`. Con el año de
 * cuatro dígitos y mes y día rellenados con cero, el orden lexicográfico y el
 * cronológico son el mismo, así que `'2026-08-06' < '2026-08-07'` es exacto. Y evita de
 * raíz la clase de bug que el resto de este archivo esquiva a mano: `new Date('2026-08-06')`
 * se interpreta como MEDIANOCHE UTC, que en Guatemala (UTC-6) es el 5 de agosto a las 6
 * de la tarde. Comparar así habría rechazado como "futuro" el día de hoy durante seis
 * horas cada noche.
 *
 * Un rango de UN SOLO DÍA (`from === to`) es válido a propósito: es lo que pide alguien
 * que quiere ver un día puntual, y es lo mismo que devuelve `computeRange('today')`.
 */
export function validateCustomRange(from: string, to: string, hoy: Date): CustomRangeError | null {
  if (!from || !to) return 'incomplete';
  if (to < from) return 'reversed';
  // Solo se mira `to`: si `from` fuera futuro y `to` no, ya habría salido por 'reversed'.
  if (to > localIsoDate(hoy)) return 'future';
  return null;
}
