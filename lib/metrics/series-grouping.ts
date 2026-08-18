import type { PeriodPoint, PeriodTotals } from '@/lib/api/dashboard';

/**
 * Agrupa la serie DIARIA de `/metrics/period` según la duración del rango pedido —
 * CU-868ktm0re / CU-868kt8yy6.
 *
 * ═══ EL BUG ═══
 *
 * CU-868kt8x90 cambió la tarjeta de tendencia para que pidiera `/api/metrics/period` y
 * leyera el filtro (antes ni eso hacía). Pero el comentario de esa tarjeta se quedó corto:
 * decía "la granularidad sale sola del rango, cero lógica que mantener" — cierto para el
 * BACKEND (`src/modules/metrics/period.ts` marca explícito "la UI decide si la muestra
 * completa o la agrupa"), falso para la UI, que simplemente pintaba la serie diaria tal
 * cual. Con "este año" son 365 puntos en un eje que solo tiene espacio legible para una
 * docena de etiquetas: exactamente el reporte de Macha ("this year pone todos los días,
 * debería contar mes a mes").
 *
 * ═══ EL UMBRAL, POR DURACIÓN Y NO POR NOMBRE DE PRESET ═══
 *
 * El selector de período admite un rango personalizado (CU-868kt2aga), así que la decisión
 * no puede colgar de qué botón se apretó — un rango a mano de 300 días tiene que agruparse
 * igual que "este año", o el mismo bug vuelve por la puerta de atrás.
 *
 * `UMBRAL_DIAS_MENSUAL = 45`. Los presets fijos dan el piso y el techo:
 *   · el más largo que debe seguir siendo DIARIO es "este mes" (máximo 31 días, y también
 *     "mes pasado");
 *   · el más corto que debe ser MENSUAL es "este trimestre" (~90-92 días).
 * 45 cae a la mitad de ese hueco: deja margen para que un rango personalizado de 5-6
 * semanas (más largo que un mes calendario pero mucho más corto que un trimestre) siga
 * mostrando sus días — que es lo que alguien esperaría al pedir "del 3 de julio al 20 de
 * agosto" — sin acercarse al punto donde 45+ puntos diarios ya no caben en el eje.
 */
export const UMBRAL_DIAS_MENSUAL = 45;

export type Granularidad = 'day' | 'month';

/** Días que abarca el rango, INCLUSIVE (from y to el mismo día = 1). */
function diasDelRango(from: string, to: string): number {
  // Mismo truco que `ventanaAnterior` del backend (`macha-backend/src/modules/metrics/
  // period.ts`): tratar el date-only como medianoche UTC es seguro acá porque es
  // aritmética entre dos fechas de calendario, no la resolución de un "hoy" sensible al
  // huso del usuario — eso ya lo resolvió `computeRange` antes de llegar hasta acá.
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}

/** Granularidad que le corresponde a un rango, solo por su duración. */
export function granularidadDeRango(from: string, to: string): Granularidad {
  return diasDelRango(from, to) > UMBRAL_DIAS_MENSUAL ? 'month' : 'day';
}

const VACIO: PeriodTotals = { revenue: 0, cogs: 0, opex: 0, other: 0 };

/** Clave de mes (`YYYY-MM`) de una fecha `YYYY-MM-DD`, sin pasar por `Date`. */
function claveDeMes(fecha: string): string {
  return fecha.slice(0, 7);
}

/**
 * Agrupa la serie diaria en un punto por mes CALENDARIO dentro de `[from, to]`.
 *
 * ═══ TODOS LOS MESES DEL RANGO, NO SOLO LOS QUE TRAEN FILAS ═══
 *
 * El backend NO rellena días sin movimiento (`seriePorDia` en el backend: "se pivota en
 * memoria... un CROSS JOIN con generate_series costaría más de lo que ahorra"). Un mes sin
 * ninguna transacción simplemente no aparece en `series`.
 *
 * Si esta función solo agrupara lo que SÍ llegó, un mes sin ventas desaparecería del eje en
 * vez de mostrarse en cero — y eso es el mismo malentendido que ya resolvió CU-868krn2up
 * para las tarjetas de KPI (`PeriodEmptyNote`): un hueco sin explicar se lee como el
 * producto roto, no como "no vendiste ese mes". La solución ahí fue mostrar el cero y
 * EXPLICARLO con `dataRange`. Acá el equivalente correcto es más simple: generar un punto
 * para cada mes del rango pedido, en CERO si no hay filas — la curva sigue completa y es la
 * misma `PeriodEmptyNote`, mirando `data.current` y `data.dataRange` del período entero
 * (no de cada mes suelto), la que ya explica un vacío que abarque todo el rango. Un mes en
 * cero en medio de una serie con datos alrededor no necesita su propia nota: se lee solo,
 * exactamente como un día en cero se leería en la vista diaria.
 *
 * `date` del punto agrupado es el PRIMER día del mes (`YYYY-MM-01`): sigue siendo una
 * fecha `DATE`-only válida, así que `formatDateAxis`/`formatDate` la formatean sin casos
 * especiales adicionales.
 */
export function agruparPorMes(serie: PeriodPoint[], from: string, to: string): PeriodPoint[] {
  const porMes = new Map<string, PeriodTotals>();
  for (const punto of serie) {
    const clave = claveDeMes(punto.date);
    const totales = porMes.get(clave) ?? { ...VACIO };
    totales.revenue += punto.revenue;
    totales.cogs += punto.cogs;
    totales.opex += punto.opex;
    totales.other += punto.other;
    porMes.set(clave, totales);
  }

  const resultado: PeriodPoint[] = [];
  // Recorre mes a mes desde el primero de `from` hasta el primero de `to`, usando el
  // constructor de `Date` con componentes (no aritmética de milisegundos): `setMonth`
  // hace el acarreo de año él solo y evita reinventar la tabla de 30/31/28/29 que el resto
  // del código ya esquiva en `lib/period.ts`.
  const [anioInicio, mesInicio] = from.split('-').map(Number);
  const [anioFin, mesFin] = to.split('-').map(Number);
  const cursor = new Date(Date.UTC(anioInicio, mesInicio - 1, 1));
  const fin = new Date(Date.UTC(anioFin, mesFin - 1, 1));
  while (cursor.getTime() <= fin.getTime()) {
    const anio = cursor.getUTCFullYear();
    const mes = String(cursor.getUTCMonth() + 1).padStart(2, '0');
    const clave = `${anio}-${mes}`;
    const totales = porMes.get(clave) ?? VACIO;
    resultado.push({ date: `${clave}-01`, ...totales });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return resultado;
}

export interface SerieAgrupada {
  granularidad: Granularidad;
  puntos: PeriodPoint[];
}

/**
 * La función que usa la tarjeta de tendencia: decide la granularidad por la duración del
 * rango y agrupa si corresponde.
 *
 * Un rango VACÍO (`serie` sin puntos) no es un caso especial: día por día devuelve `[]`
 * tal cual (nada que pintar, la tarjeta ya maneja ese estado), y mes por mes igual genera
 * los meses del rango en cero — es el mismo comportamiento de "mes sin filas" que cualquier
 * otro mes vacío dentro de una serie parcial, no un caso aparte.
 */
export function agruparSerieDeTendencia(
  serie: PeriodPoint[],
  from: string,
  to: string,
): SerieAgrupada {
  const granularidad = granularidadDeRango(from, to);
  if (granularidad === 'day') return { granularidad, puntos: serie };
  return { granularidad, puntos: agruparPorMes(serie, from, to) };
}
