import { describe, expect, test } from 'bun:test';
import { puntosDeSerie } from '@/components/analytics/paneles';
import { getDictionary } from '@/lib/i18n/get-dictionary';

/**
 * CU-868ktvh75 — Analítica pintaba la serie DIARIA sin agrupar.
 *
 * Es el mismo defecto que CU-868ktm0re arregló en el dashboard: el backend manda una serie
 * diaria y deja la agrupación a la UI (está dicho en `modules/metrics/period.ts`), pero este
 * panel la mapeaba 1:1. Con "este año" eso son 365 puntos en un eje con espacio para una
 * docena. Analítica tiene su propio panel y se había quedado con la versión vieja.
 */

const labels = getDictionary('es').analytics;

/** Un punto de serie con solo lo que esta función mira. */
function punto(date: string, revenue: number) {
  return { date, revenue, cogs: 0, opex: 0, other: 0 };
}

describe('puntosDeSerie', () => {
  test('un rango largo se agrupa por mes, no punto por día', () => {
    // Tres días de enero y dos de febrero: cinco puntos diarios, dos meses.
    const serie = [
      punto('2026-01-05', 100),
      punto('2026-01-10', 200),
      punto('2026-01-20', 300),
      punto('2026-02-03', 400),
      punto('2026-02-14', 500),
    ];

    const puntos = puntosDeSerie(serie, 'es', labels, { from: '2026-01-01', to: '2026-12-31' });

    // Doce meses del año, no cinco días — los meses sin movimiento se rellenan en cero para
    // que la curva no invente una continuidad que no existe.
    expect(puntos).toHaveLength(12);
    expect(puntos[0]![labels.revenueTrend]).toBe(600);
    expect(puntos[1]![labels.revenueTrend]).toBe(900);
    expect(puntos[2]![labels.revenueTrend]).toBe(0);
  });

  test('un rango corto conserva el detalle diario', () => {
    // Lo que se arregla es el rango largo; achatar también los cortos sería cambiar un
    // defecto por otro, porque en una semana el día ES la unidad que el usuario quiere ver.
    const serie = [punto('2026-03-02', 10), punto('2026-03-03', 20)];

    const puntos = puntosDeSerie(serie, 'es', labels, { from: '2026-03-01', to: '2026-03-07' });

    expect(puntos).toHaveLength(2);
    expect(puntos[0]![labels.revenueTrend]).toBe(10);
  });

  test('sin rango se comporta como antes: día a día', () => {
    // El parámetro es opcional para no romper a un llamador que no lo pase. Lo que no puede
    // pasar es que su ausencia agrupe por su cuenta: sin saber el rango, agrupar sería
    // adivinar.
    const serie = [punto('2026-03-02', 10), punto('2026-03-03', 20)];

    expect(puntosDeSerie(serie, 'es', labels)).toHaveLength(2);
  });

  test('la salida junta costo directo y gasto operativo', () => {
    // Es como sale el dinero de la cuenta. Separarlos acá contestaría otra pregunta — esa la
    // contesta el desglose por categoría del tab de Costos.
    const serie = [{ date: '2026-03-02', revenue: 100, cogs: 30, opex: 20, other: 0 }];

    const [p] = puntosDeSerie(serie, 'es', labels, { from: '2026-03-01', to: '2026-03-07' });

    expect(p![labels.outflow]).toBe(50);
    expect(p![labels.inflow]).toBe(100);
  });

  test('una serie vacía no revienta', () => {
    expect(puntosDeSerie([], 'es', labels, { from: '2026-03-01', to: '2026-03-07' })).toEqual([]);
  });
});
