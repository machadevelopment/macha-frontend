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
/**
 * Ventana MÓVIL de N días que termina hoy: "los últimos 30 días".
 *
 * ═══ POR QUÉ NO ALCANZABAN LAS PÍLDORAS (2026-08-24) ═══
 *
 * `computeRange` da períodos de CALENDARIO —este mes, este trimestre, este año— y esos
 * contestan "¿cómo voy en agosto?". La pregunta que un dueño hace más seguido es otra:
 * "¿cómo vengo últimamente?", y esa no tiene borde de calendario. El día 2 del mes, "este mes"
 * son dos días de datos y no dice nada.
 *
 * Sin esto, pedir "los últimos 30 días" obligaba a abrir el panel personalizado, elegir dos
 * fechas en el calendario del sistema y confirmar: tres interacciones para el rango más común
 * que las píldoras no cubren.
 *
 * ═══ N DÍAS INCLUYE HOY ═══
 *
 * "Últimos 7 días" son hoy y los seis anteriores, no hoy y los siete anteriores. Es lo que
 * espera quien lo pide y lo que hace que 7 días den exactamente una semana de datos.
 */
export function rollingRange(dias: number, hoy: Date): DateRange {
  const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const inicio = new Date(fin);
  inicio.setDate(inicio.getDate() - (dias - 1));
  return { from: localIsoDate(inicio), to: localIsoDate(fin) };
}

/**
 * Cuántos días cubre un rango, contando los dos extremos.
 *
 * Se usa para decirle al cliente el TAMAÑO de lo que eligió antes de aplicarlo. Sin esa cifra,
 * dos fechas en un calendario no dicen si seleccionó un mes o un trimestre hasta que las cifras
 * del dashboard cambian — y para entonces ya no sabe si el salto es del negocio o del rango.
 */
export function rangeDays(range: DateRange): number {
  const [ay, am, ad] = range.from.split('-').map(Number);
  const [by, bm, bd] = range.to.split('-').map(Number);
  const a = new Date(ay!, am! - 1, ad!);
  const b = new Date(by!, bm! - 1, bd!);
  // Redondeo: entre dos fechas locales puede haber un cambio de horario de verano y la
  // división daría 29,958 días.
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

export function validateCustomRange(from: string, to: string, hoy: Date): CustomRangeError | null {
  if (!from || !to) return 'incomplete';
  if (to < from) return 'reversed';
  // Solo se mira `to`: si `from` fuera futuro y `to` no, ya habría salido por 'reversed'.
  if (to > localIsoDate(hoy)) return 'future';
  return null;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * ¿EL PERÍODO VISIBLE DEJA DATOS AFUERA? (2026-08-25)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * El dashboard abre en "este mes". Un cliente que acaba de subir su contabilidad completa está
 * viendo, sin saberlo, una fracción de lo que cargó — y la reacción es concluir que el sistema
 * no leyó su archivo.
 *
 * Pasó y costó un día: CarsGT subió 19 meses (feb 2025 → ago 2026, 240 ventas) y el dashboard
 * mostró agosto (45 ventas). Las cifras eran correctas al quetzal, pero contra los totales del
 * archivo no se parecían a nada, y el reporte que llegó fue "esta data no tiene absolutamente
 * nada que ver con el Excel". Se buscó el defecto en la ingesta, en el prompt y en la base
 * durante horas. No había ninguno: la pantalla decía `MOSTRANDO 1 AGO – 31 AGO` en gris, bajo
 * seis cifras enormes que gritaban otra cosa.
 *
 * `dataRange` ya viajaba en la respuesta de `/metrics/period` desde CU-868krn2up, donde se
 * agregó para explicar un período en CERO. Este es el caso hermano y más frecuente: el período
 * no está vacío, solo es una parte — y ahí el silencio engaña más, porque hay cifras que
 * mirar.
 *
 * Devuelve `false` cuando no hay nada que advertir: sin datos, o con un período que ya los
 * cubre. La nota solo aparece cuando de verdad falta algo por ver.
 */
export function hayDatosFueraDelRango(
  range: DateRange,
  dataRange: { from: string; to: string } | null | undefined,
): boolean {
  if (!dataRange) return false;
  // Fechas ISO (`YYYY-MM-DD`): el orden lexicográfico ES el cronológico.
  return dataRange.from < range.from || dataRange.to > range.to;
}
