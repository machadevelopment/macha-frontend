import { describe, expect, test } from 'bun:test';
import { margenBruto, delta } from '@/lib/metrics/period-totals';
// El tipo vive en `lib/api/dashboard` — `period-totals` solo lo consume.
import type { PeriodTotals } from '@/lib/api/dashboard';

/**
 * CU-868ku9q7c — el delta del MARGEN va en puntos porcentuales, no en porcentaje.
 *
 * La tarjeta de Margen era la única de las cinco sin delta ni sparkline, y el grid estira
 * todas a la misma altura: la suya quedaba con un blanco del tamaño de una gráfica. Eso es
 * lo que Jose leyó como "diferente tamaño".
 *
 * Al darle su delta apareció una decisión que no es obvia y que este archivo fija: NO se
 * puede usar `delta()`. Esa función divide entre el valor previo, o sea da la variación
 * RELATIVA — correcta para ingresos, engañosa para un margen. El dueño que ve 50 % y 52 %
 * al lado espera "+2", no "+4 %".
 */

const totales = (revenue: number, cogs: number): PeriodTotals => ({
  revenue,
  cogs,
  opex: 0,
  other: 0,
});

describe('delta del margen en puntos porcentuales', () => {
  test('de 50 % a 52 % son +2 puntos, no +4 %', () => {
    const previo = margenBruto(totales(1000, 500))!; // 0.50
    const actual = margenBruto(totales(1000, 480))!; // 0.52

    // Lo que se muestra: la resta directa.
    expect(actual - previo).toBeCloseTo(0.02, 6);

    // Lo que habría mostrado `delta()`, y por qué no sirve acá: es el DOBLE, y también es
    // un número correcto — solo que responde otra pregunta.
    expect(delta(actual, previo)).toBeCloseTo(0.04, 6);
  });

  test('un margen que cae da un delta negativo', () => {
    const previo = margenBruto(totales(1000, 400))!; // 0.60
    const actual = margenBruto(totales(1000, 550))!; // 0.45

    expect(actual - previo).toBeCloseTo(-0.15, 6);
  });

  test('sin ventas en el período anterior NO hay delta que mostrar', () => {
    /*
     * `margenBruto` devuelve `null` con ingresos en cero —dividir entre cero no es 0 %— y
     * la tarjeta deja el delta en `undefined` en vez de inventar un "+100 %". Es el mismo
     * criterio que ya aplica `delta()` cuando el previo es cero.
     */
    expect(margenBruto(totales(0, 0))).toBeNull();
  });

  test('la serie del sparkline pinta 0 en los meses sin ventas, no los omite', () => {
    // Omitirlos comprimiría el eje horizontal y la curva mentiría sobre CUÁNDO pasó cada
    // cosa. Un cero es visualmente honesto: ese mes no hubo margen.
    const series = [totales(1000, 500), totales(0, 0), totales(1000, 400)];
    const serieDeMargen = series.map((t) => margenBruto(t) ?? 0);

    expect(serieDeMargen).toHaveLength(3);
    expect(serieDeMargen[1]).toBe(0);
  });
});
