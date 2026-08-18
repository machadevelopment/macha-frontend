import { describe, expect, test } from 'bun:test';
import { computeRange } from '@/lib/period';
import { utilidadBruta } from '@/lib/metrics/period-totals';

/**
 * CU-868kt8x90 — "la gráfica de tendencia se queda en mensual al cambiar a hoy o esta
 * semana".
 *
 * El diagnóstico del ticket hablaba de GRANULARIDAD. No era eso: la tarjeta pedía
 * `/api/metrics?months=12` y **no leía el filtro en absoluto**. Mostraba los últimos doce
 * meses pasara lo que pasara — así que "hoy" y "este año" pintaban la misma curva.
 *
 * Ahora usa `/api/metrics/period`, que devuelve una serie DIARIA del rango exacto. Lo que
 * se prueba acá es la premisa de la que depende TODO lo demás: que cada preset produzca un
 * rango de tamaño distinto.
 *
 * ═══ CORRECCIÓN (CU-868ktm0re) ═══
 *
 * La versión anterior de este comentario decía "la granularidad sale sola del rango, cero
 * lógica que mantener" — y eso era falso: la serie diaria se pintaba TAL CUAL llegaba, así
 * que "este año" mostraba 365 puntos en un eje que solo tiene espacio legible para una
 * docena. La lógica de agrupación SÍ existe y vive en `lib/metrics/series-grouping.ts`
 * (`agruparSerieDeTendencia`), con sus propios tests — este archivo se queda con la premisa
 * de tamaños que la justifica, no con la agrupación en sí.
 */

const HOY = new Date(2026, 7, 15); // 15 de agosto de 2026

/** Días que abarca un rango, inclusive. Es cuántos puntos va a tener la serie. */
function dias({ from, to }: { from: string; to: string }): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}

describe('cada período produce una serie de tamaño distinto', () => {
  test('hoy es un solo punto', () => {
    expect(dias(computeRange('today', HOY))).toBe(1);
  });

  test('esta semana son siete', () => {
    expect(dias(computeRange('week', HOY))).toBe(7);
  });

  test('el mes son sus días, no doce puntos', () => {
    // Agosto tiene 31. Con el bug, este caso y el de "hoy" daban la MISMA gráfica de 12
    // meses — que es exactamente lo que Macha vio.
    expect(dias(computeRange('month', HOY))).toBe(31);
  });

  test('el año son 365, y los cuatro tamaños son distintos entre sí', () => {
    const tamanos = (['today', 'week', 'month', 'quarter', 'year'] as const).map((k) =>
      dias(computeRange(k, HOY)),
    );
    expect(dias(computeRange('year', HOY))).toBe(365);
    // Ninguno se repite: si dos presets dieran el mismo rango, el usuario no podría
    // distinguir si el filtro funcionó.
    expect(new Set(tamanos).size).toBe(tamanos.length);
  });
});

describe('el margen de la curva se deriva igual que en el resto del producto', () => {
  test('es ingreso menos costo directo, sin restar gasto operativo', () => {
    /*
     * La serie del período trae los cuatro tipos y el margen hay que derivarlo. Se usa
     * `utilidadBruta` en vez de restar a mano: el bug que originó CU-868kh8y58 fue
     * exactamente que dos pantallas restaban cosas distintas y las dos parecían correctas.
     */
    const punto = { revenue: 1000, cogs: 400, opex: 250, other: 0 };
    expect(utilidadBruta(punto)).toBe(600);
    expect(utilidadBruta(punto)).not.toBe(punto.revenue - punto.cogs - punto.opex);
  });
});
