import type { AgingBuckets, PeriodMetricsResponse } from '@/lib/api/dashboard';

/**
 * Cuándo Analítica debe reemplazar TODA la pantalla por "todavía no hay nada".
 *
 * ═══ POR QUÉ ES UNA FUNCIÓN Y NO UN `if` SUELTO (CU-868kt29t0) ═══
 *
 * Antes bastaba con que el período viniera vacío: la pantalla no tenía más que gráficas del
 * período, así que sin movimientos no había nada que mostrar.
 *
 * Con los tabs de cartera eso pasó a ser INCORRECTO. Una empresa puede no tener movimientos
 * este mes y sí tener facturas por cobrar de meses anteriores — y la cartera abierta no
 * depende del período. Con la regla vieja, esa empresa vería "todavía no hay movimientos"
 * mientras le deben dinero, o sea que el producto le esconde lo único accionable que tiene
 * justo en el mes en que más lo necesita.
 *
 * Vive acá y con test propio porque es una decisión de qué se le OCULTA al usuario, no un
 * detalle de maquetación.
 */
export function pantallaVacia(params: {
  serie: PeriodMetricsResponse['series'];
  /** `null` mientras `/ar-ap` no responde o si falló. */
  cartera: { ar: AgingBuckets; ap: AgingBuckets } | null;
}): boolean {
  const hayPeriodo = params.serie.some((p) => p.revenue || p.cogs || p.opex || p.other);
  if (hayPeriodo) return false;

  /*
   * `cartera === null` NO cuenta como "no hay cartera".
   *
   * Es el estado mientras la petición viaja, y también si falló. Tratarlo como cartera vacía
   * pintaría el mensaje de "no hay nada" durante la carga y luego lo reemplazaría por los
   * tabs — un parpadeo que además afirma algo falso mientras dura. Ante la duda, NO se
   * declara vacío: mostrar tabs con una tarjeta en blanco es honesto; decir "no tienes nada"
   * cuando no se sabe, no.
   */
  if (params.cartera === null) return false;

  const total = (b: AgingBuckets) => Object.values(b).reduce((s, v) => s + v, 0);
  return total(params.cartera.ar) + total(params.cartera.ap) === 0;
}
