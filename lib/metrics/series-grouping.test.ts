import { describe, expect, test } from 'bun:test';
import type { PeriodPoint } from '@/lib/api/dashboard';
import {
  agruparPorMes,
  agruparSerieDeTendencia,
  granularidadDeRango,
  UMBRAL_DIAS_MENSUAL,
} from './series-grouping';

/**
 * CU-868ktm0re — "al poner 'este año' la gráfica pone todos los días, en vez de todos los
 * meses". El backend manda una serie DIARIA sin importar el rango (`/metrics/period`,
 * comentario explícito: "la UI decide si la muestra completa o la agrupa") y esta tarjeta
 * la pintaba tal cual llegaba. Estos tests cubren la función pura que faltaba, con foco en
 * los bordes: el cambio de mes, el rango de un solo día y el rango vacío son justo donde
 * esto se rompe.
 */

const punto = (date: string, revenue: number): PeriodPoint => ({
  date,
  revenue,
  cogs: 0,
  opex: 0,
  other: 0,
});

describe('granularidadDeRango', () => {
  test('los presets cortos (hoy, semana, mes) se quedan en día', () => {
    expect(granularidadDeRango('2026-08-18', '2026-08-18')).toBe('day'); // hoy
    expect(granularidadDeRango('2026-08-10', '2026-08-16')).toBe('day'); // semana
    expect(granularidadDeRango('2026-08-01', '2026-08-31')).toBe('day'); // mes, 31 días
  });

  test('los presets largos (trimestre, año) pasan a mes', () => {
    // Un trimestre calendario son 90-92 días.
    expect(granularidadDeRango('2026-07-01', '2026-09-30')).toBe('month');
    expect(granularidadDeRango('2026-01-01', '2026-12-31')).toBe('month'); // 365 días
  });

  test(`el umbral es ${UMBRAL_DIAS_MENSUAL} días, no el nombre del preset`, () => {
    // Un rango personalizado justo en el umbral y uno justo arriba: la decisión es por
    // DURACIÓN. Si esto colgara del preset, un rango a mano de 300 días volvería a pintar
    // 300 puntos — que es el bug que este ticket vino a cerrar, solo que por otra puerta.
    const inicio = new Date(Date.UTC(2026, 0, 1));
    const finExacto = new Date(inicio);
    finExacto.setUTCDate(finExacto.getUTCDate() + (UMBRAL_DIAS_MENSUAL - 1));
    const finPasado = new Date(inicio);
    finPasado.setUTCDate(finPasado.getUTCDate() + UMBRAL_DIAS_MENSUAL);

    const iso = (d: Date) => d.toISOString().slice(0, 10);
    expect(granularidadDeRango('2026-01-01', iso(finExacto))).toBe('day');
    expect(granularidadDeRango('2026-01-01', iso(finPasado))).toBe('month');
  });

  test('un rango personalizado de 300 días no produce 300 puntos', () => {
    // Cubre el caso explícito del ticket: no importa que el usuario nunca haya tocado
    // "este año", un rango largo a mano tiene que agruparse igual.
    expect(granularidadDeRango('2026-01-01', '2026-10-28')).toBe('month'); // ~301 días
  });
});

describe('agruparPorMes', () => {
  test('agrupa dos meses con datos en uno solo', () => {
    const serie = [punto('2026-01-05', 100), punto('2026-01-20', 50), punto('2026-02-10', 30)];
    const agrupado = agruparPorMes(serie, '2026-01-01', '2026-02-28');
    expect(agrupado).toEqual([
      { date: '2026-01-01', revenue: 150, cogs: 0, opex: 0, other: 0 },
      { date: '2026-02-01', revenue: 30, cogs: 0, opex: 0, other: 0 },
    ]);
  });

  // El backend NO rellena días sin movimiento (`seriePorDia` en macha-backend): un mes sin
  // filas simplemente no aparece en `series`. Si esta función solo agrupara lo que llegó,
  // ese mes desaparecería del eje en vez de mostrarse en cero — el mismo malentendido que
  // ya resolvió CU-868krn2up para las tarjetas de KPI, aplicado a la curva.
  test('un mes SIN filas aparece en cero, no desaparece del eje', () => {
    const serie = [punto('2026-01-05', 100), punto('2026-03-15', 40)];
    const agrupado = agruparPorMes(serie, '2026-01-01', '2026-03-31');
    expect(agrupado).toHaveLength(3);
    expect(agrupado[1]).toEqual({ date: '2026-02-01', revenue: 0, cogs: 0, opex: 0, other: 0 });
  });

  test('un rango vacío en toda la ventana produce meses en cero, no un arreglo vacío', () => {
    // Empresa sin movimientos en el rango pedido (pero con datos en otro lado, o sin
    // ninguno): la curva sigue teniendo un punto por mes. La tarjeta de KPI de arriba es
    // la que explica el vacío con `dataRange` (CU-868krn2up); esta función no duplica esa
    // lógica, solo no le miente al eje omitiendo meses.
    const agrupado = agruparPorMes([], '2026-01-01', '2026-03-31');
    expect(agrupado.map((p) => p.date)).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
    expect(agrupado.every((p) => p.revenue === 0)).toBe(true);
  });

  test('el cambio de año no se pierde (diciembre a enero)', () => {
    const serie = [punto('2025-12-20', 10), punto('2026-01-05', 20)];
    const agrupado = agruparPorMes(serie, '2025-12-01', '2026-01-31');
    expect(agrupado.map((p) => p.date)).toEqual(['2025-12-01', '2026-01-01']);
    expect(agrupado[0].revenue).toBe(10);
    expect(agrupado[1].revenue).toBe(20);
  });

  test('un rango de un solo mes calendario produce un único punto', () => {
    const agrupado = agruparPorMes([punto('2026-05-15', 5)], '2026-05-01', '2026-05-31');
    expect(agrupado).toHaveLength(1);
    expect(agrupado[0]).toEqual({ date: '2026-05-01', revenue: 5, cogs: 0, opex: 0, other: 0 });
  });

  test('suma los cuatro tipos, no solo revenue', () => {
    const serie: PeriodPoint[] = [
      { date: '2026-04-01', revenue: 100, cogs: 40, opex: 10, other: 5 },
      { date: '2026-04-15', revenue: 50, cogs: 20, opex: 5, other: 0 },
    ];
    const [total] = agruparPorMes(serie, '2026-04-01', '2026-04-30');
    expect(total).toEqual({ date: '2026-04-01', revenue: 150, cogs: 60, opex: 15, other: 5 });
  });
});

describe('agruparSerieDeTendencia', () => {
  test('rango corto: la serie diaria pasa intacta, sin agrupar', () => {
    const serie = [punto('2026-08-10', 1), punto('2026-08-12', 2)];
    const { granularidad, puntos } = agruparSerieDeTendencia(serie, '2026-08-08', '2026-08-14');
    expect(granularidad).toBe('day');
    expect(puntos).toBe(serie); // misma referencia: día no reconstruye el arreglo
  });

  test('rango de un solo día (hoy) sigue siendo un punto, no se agrupa', () => {
    const serie = [punto('2026-08-18', 999)];
    const { granularidad, puntos } = agruparSerieDeTendencia(serie, '2026-08-18', '2026-08-18');
    expect(granularidad).toBe('day');
    expect(puntos).toEqual(serie);
  });

  test('un día sin ventas hoy: serie vacía, no un punto en cero inventado', () => {
    // Distinto del caso mensual: la vista diaria no rellena — eso ya lo decidió el backend
    // (no hay "días vecinos" que mostrar en cero dentro de un rango de un solo día) y
    // sigue siendo el comportamiento de antes de este ticket, que nadie reportó roto.
    const { granularidad, puntos } = agruparSerieDeTendencia([], '2026-08-18', '2026-08-18');
    expect(granularidad).toBe('day');
    expect(puntos).toEqual([]);
  });

  test('este año: agrupa a 12 puntos mensuales', () => {
    const serie = [punto('2026-01-10', 100), punto('2026-06-01', 200), punto('2026-12-31', 50)];
    const { granularidad, puntos } = agruparSerieDeTendencia(serie, '2026-01-01', '2026-12-31');
    expect(granularidad).toBe('month');
    expect(puntos).toHaveLength(12);
    expect(puntos[0].revenue).toBe(100);
    expect(puntos[5].revenue).toBe(200);
    expect(puntos[11].revenue).toBe(50);
  });

  test('este trimestre: agrupa a 3 puntos mensuales', () => {
    const { granularidad, puntos } = agruparSerieDeTendencia([], '2026-07-01', '2026-09-30');
    expect(granularidad).toBe('month');
    expect(puntos).toHaveLength(3);
  });
});
