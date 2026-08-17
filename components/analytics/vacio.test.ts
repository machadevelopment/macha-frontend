import { describe, expect, test } from 'bun:test';
import { pantallaVacia } from './vacio';
import { VARIANTE, TRAMOS } from './tab-cartera';
import type { AgingBuckets, PeriodMetricsResponse } from '@/lib/api/dashboard';

/**
 * CU-868kt29t0 — qué se le OCULTA al usuario, y con qué color se le señala una mora.
 *
 * Las dos cosas de esta pantalla que pueden fallar sin que se note: esconder datos que sí
 * existen, y pintar de un color que dice lo contrario de lo que pasa.
 */

const CERO: AgingBuckets = { current: 0, '1_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0 };
const SIN_CARTERA = { ar: CERO, ap: CERO };

const punto = (v: Partial<PeriodMetricsResponse['series'][number]>) => ({
  date: '2026-08-01',
  revenue: 0,
  cogs: 0,
  opex: 0,
  other: 0,
  ...v,
});

describe('pantallaVacia', () => {
  test('sin movimientos y sin cartera, la pantalla está vacía', () => {
    expect(pantallaVacia({ serie: [punto({})], cartera: SIN_CARTERA })).toBe(true);
  });

  test('CUALQUIERA de los cuatro tipos con movimiento ya no es vacío', () => {
    // Un mes en que la empresa solo tuvo gastos SÍ tiene datos, y decirle "no hay
    // movimientos" mientras las tarjetas muestran sus gastos sería una contradicción en
    // pantalla.
    for (const campo of ['revenue', 'cogs', 'opex', 'other'] as const) {
      expect(pantallaVacia({ serie: [punto({ [campo]: 1 })], cartera: SIN_CARTERA })).toBe(false);
    }
  });

  test('SIN movimientos pero CON facturas por cobrar, NO está vacía', () => {
    /*
     * ═══ EL CASO QUE MOTIVÓ ESTA FUNCIÓN ═══
     *
     * Con la regla vieja —"vacío = el período no tiene movimientos"— esta empresa vería
     * "todavía no hay movimientos" mientras le deben Q 5.000. La cartera abierta no depende
     * del período, así que el producto le escondería lo único accionable que le queda, y
     * justo en el mes en que más lo necesita.
     */
    const cartera = { ar: { ...CERO, '90_plus': 5000 }, ap: CERO };
    expect(pantallaVacia({ serie: [punto({})], cartera })).toBe(false);
  });

  test('lo mismo con cuentas por PAGAR: también son datos', () => {
    const cartera = { ar: CERO, ap: { ...CERO, current: 800 } };
    expect(pantallaVacia({ serie: [punto({})], cartera })).toBe(false);
  });

  test('mientras la cartera no responde, NO se declara vacío', () => {
    /*
     * `null` es el estado durante la carga y también si `/ar-ap` falló. Tratarlo como cartera
     * vacía pintaría "no tienes nada" durante la carga y luego lo reemplazaría por los tabs:
     * un parpadeo que además afirma algo falso mientras dura. Ante la duda no se afirma.
     */
    expect(pantallaVacia({ serie: [punto({})], cartera: null })).toBe(false);
  });

  test('una serie sin puntos y sin cartera también es vacío', () => {
    // Es el estado de una empresa recién registrada.
    expect(pantallaVacia({ serie: [], cartera: SIN_CARTERA })).toBe(true);
  });
});

describe('color por tramo de antigüedad', () => {
  test('estar al día es NEUTRO, no verde', () => {
    // Estar al día es lo normal, no un logro. El verde funcional se reserva para lo que de
    // verdad señala una buena noticia; gastarlo acá le quita fuerza donde sí importa.
    expect(VARIANTE.current).toBe('neutral');
  });

  test('la mora escala, y a los 61 días ya es grave', () => {
    // Que los cinco tramos tuvieran el mismo color haría que la tabla no dijera nada: el
    // orden de gravedad ES la información.
    expect(VARIANTE['1_30']).toBe('warning');
    expect(VARIANTE['31_60']).toBe('warning');
    expect(VARIANTE['61_90']).toBe('danger');
    expect(VARIANTE['90_plus']).toBe('danger');
  });

  test('ningún tramo se queda sin color asignado', () => {
    // Un tramo nuevo en el backend sin entrada acá rendería `undefined` como variante del
    // chip, y el chip saldría sin estilo en vez de romperse.
    for (const t of TRAMOS) expect(VARIANTE[t]).toBeDefined();
  });

  test('los tramos se listan del más sano al más grave', () => {
    // El orden de presentación no es cosmético: una antigüedad se lee en escalera, y
    // desordenarla obliga a leer los cinco rótulos para entender la tabla.
    expect(TRAMOS).toEqual(['current', '1_30', '31_60', '61_90', '90_plus']);
  });
});
