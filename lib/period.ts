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

export type PeriodKey = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
  from: string;
  to: string;
}

const iso = (d: Date): string => {
  // `toISOString()` convierte a UTC y correría la fecha; se arma a mano desde los
  // componentes locales.
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};

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
    case 'year':
      return {
        from: iso(new Date(d.getFullYear(), 0, 1)),
        to: iso(new Date(d.getFullYear(), 11, 31)),
      };
  }
}
