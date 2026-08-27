import { describe, expect, test } from 'bun:test';
import {
  carteraEnVista,
  categoriasEnVista,
  metricasEnVista,
  productosEnVista,
  totalesEnVista,
} from '@/lib/fx-display-shapes';
import type { VistaDeMoneda } from '@/lib/fx-display';
import type { PeriodMetricsResponse, ProductRevenue } from '@/lib/api/dashboard';

const EN_DOLARES: VistaDeMoneda = {
  moneda: 'USD',
  esBase: false,
  tasa: { rate: 7.7, effectiveDate: '2026-08-01' },
};
const EN_BASE: VistaDeMoneda = { moneda: 'GTQ', esBase: true, tasa: null };

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * QUÉ SE CONVIERTE Y —SOBRE TODO— QUÉ NO
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * La mitad valiosa de este archivo es la segunda. Estas respuestas mezclan dinero con conteos
 * (`transactionCount`, `units`) y con porcentajes (`sharePct`, `grossMarginPct`). Un conversor
 * que recorriera "todos los números" los escalaría también, y ninguno de esos errores falla:
 * 240 transacciones se vuelven 31 y un margen del 38 % se vuelve 4,9 %, los dos pintados con
 * total normalidad.
 *
 * TypeScript no protege de esto —un spread no se queja de un campo de más— así que estos tests
 * son la única red cuando alguien agregue un campo a una de estas formas.
 */
describe('los montos se convierten', () => {
  test('los cuatro totales del período', () => {
    const t = { revenue: 7_700, cogs: 3_850, opex: 770, other: 77 };
    expect(totalesEnVista(t, EN_DOLARES)).toEqual({
      revenue: 1_000,
      cogs: 500,
      opex: 100,
      other: 10,
    });
  });

  test('la serie completa, conservando su fecha', () => {
    const m = {
      baseCurrency: 'GTQ',
      from: '2026-08-01',
      to: '2026-08-31',
      current: { revenue: 7_700, cogs: 0, opex: 0, other: 0 },
      previous: { revenue: 15_400, cogs: 0, opex: 0, other: 0 },
      series: [{ date: '2026-08-01', revenue: 7_700, cogs: 0, opex: 0, other: 0 }],
      dataRange: null,
    } satisfies PeriodMetricsResponse;

    const r = metricasEnVista(m, EN_DOLARES);
    expect(r.current.revenue).toBe(1_000);
    expect(r.previous.revenue).toBe(2_000);
    expect(r.series[0]!.revenue).toBe(1_000);
    expect(r.series[0]!.date).toBe('2026-08-01');
  });

  /*
   * El rótulo viaja con la cifra o no sirve de nada. Varios paneles sacan la moneda de
   * `baseCurrency`, así que si se dejara en GTQ con los números ya divididos, la pantalla
   * mostraría dólares diciendo "GTQ" — el fallo exacto que este diseño existe para impedir.
   */
  test('`baseCurrency` pasa a ser la moneda de la VISTA', () => {
    const m = {
      baseCurrency: 'GTQ',
      from: '2026-08-01',
      to: '2026-08-31',
      current: { revenue: 7_700, cogs: 0, opex: 0, other: 0 },
      previous: { revenue: 0, cogs: 0, opex: 0, other: 0 },
      series: [],
      dataRange: null,
    } satisfies PeriodMetricsResponse;
    expect(metricasEnVista(m, EN_DOLARES).baseCurrency).toBe('USD');
  });

  test('la cartera, bucket por bucket', () => {
    const b = { current: 7_700, '1_30': 770, '31_60': 77, '61_90': 7.7, '90_plus': 0 };
    expect(carteraEnVista(b, EN_DOLARES)).toEqual({
      current: 1_000,
      '1_30': 100,
      '31_60': 10,
      '61_90': 1,
      '90_plus': 0,
    });
  });
});

describe('lo que NO es dinero sale intacto', () => {
  const producto: ProductRevenue = {
    productId: 'p1',
    name: 'Camisa Oxford',
    category: 'ropa',
    revenue: 7_700,
    cogs: 3_850,
    grossProfit: 3_850,
    grossMarginPct: 50,
    units: 240,
    revenueWithUnits: 7_700,
    transactionCount: 120,
    revenueSharePct: 38.4,
    previousRevenue: 15_400,
    trend: 'up',
  };

  test('un producto convierte sus montos y conserva conteos, porcentajes y tendencia', () => {
    const [r] = productosEnVista([producto], EN_DOLARES);
    // dinero
    expect(r!.revenue).toBe(1_000);
    expect(r!.cogs).toBe(500);
    expect(r!.grossProfit).toBe(500);
    expect(r!.revenueWithUnits).toBe(1_000);
    expect(r!.previousRevenue).toBe(2_000);
    // NO dinero — si alguno de estos cambia, la pantalla está inventando datos de negocio
    expect(r!.units).toBe(240);
    expect(r!.transactionCount).toBe(120);
    expect(r!.grossMarginPct).toBe(50);
    expect(r!.revenueSharePct).toBe(38.4);
    expect(r!.trend).toBe('up');
    expect(r!.name).toBe('Camisa Oxford');
  });

  test('una categoría convierte el total y conserva su conteo y su participación', () => {
    const [r] = categoriasEnVista(
      [{ category: 'servicios', type: 'opex', total: 7_700, transactionCount: 42, sharePct: 11 }],
      EN_DOLARES,
    );
    expect(r!.total).toBe(1_000);
    expect(r!.transactionCount).toBe(42);
    expect(r!.sharePct).toBe(11);
  });

  /*
   * El margen es una razón entre dos cifras de la MISMA moneda, así que dividir arriba y abajo
   * por la tasa lo deja igual. Este test lo comprueba sobre el resultado convertido en vez de
   * afirmarlo: si alguien escalara el porcentaje, los dos lados dejarían de coincidir.
   */
  test('el margen calculado sobre las cifras convertidas es el mismo que sobre las originales', () => {
    const [r] = productosEnVista([producto], EN_DOLARES);
    const margenConvertido = (r!.grossProfit / r!.revenue) * 100;
    const margenOriginal = (producto.grossProfit / producto.revenue) * 100;
    expect(margenConvertido).toBeCloseTo(margenOriginal, 10);
  });
});

describe('en la vista base no se toca nada', () => {
  /*
   * Y devuelve la MISMA referencia, no una copia igual. Es lo que hace que activar esta
   * capa no cueste re-renders en la inmensa mayoría de los clientes, que operan en una sola
   * moneda y nunca van a tocar el botón.
   */
  test('devuelve el mismo objeto, sin copiar', () => {
    const items: ProductRevenue[] = [];
    expect(productosEnVista(items, EN_BASE)).toBe(items);
    const t = { revenue: 1, cogs: 2, opex: 3, other: 4 };
    expect(totalesEnVista(t, EN_BASE)).toBe(t);
  });
});
