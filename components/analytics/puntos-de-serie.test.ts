import { describe, expect, test } from 'bun:test';
import { puntosDeSerie, desgloseDeSalidas } from '@/components/analytics/paneles';
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

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * "EL TOTAL DE SALIDAS NO COINCIDE CON EL EXCEL" — Y COINCIDÍA (Jose, 2026-08-26)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * El reporte decía que las entradas estaban bien y las salidas no. **Medido contra la base de
 * producción, el número era correcto**: el 5 de agosto de 2026 de Gym Supplements suma
 * GTQ 10.780,52 en 13 movimientos, y la captura del Excel mostraba la nómina —GTQ 10.306,41—
 * que es UNO de esos trece. Los 474,11 de diferencia son costo de lo vendido, que en ese libro
 * vive en otra hoja.
 *
 * O sea que no había nada que arreglar en la aritmética y sí algo que arreglar en el producto:
 * la cifra no se podía reconciliar con nada. La serie sigue dibujando UNA línea de salidas —así
 * sale el dinero de la cuenta— y lo que se agrega es que el punto lleve sus dos partes para que
 * el tooltip las muestre.
 *
 * Los números de este test son los de producción a propósito. Un fixture inventado probaría la
 * suma; estos prueban el caso que se reportó.
 */
describe('el punto de la serie lleva las partes de la salida', () => {
  const LABELS = {
    revenueTrend: 'Ingresos',
    inflow: 'Entradas',
    outflow: 'Salidas',
    outflowCogs: 'Costo de lo vendido',
    outflowOpex: 'Gastos operativos',
  } as unknown as Parameters<typeof puntosDeSerie>[2];

  // El 5 de agosto de 2026 de Gym Supplements, tal como está en producción.
  const SERIE = [{ date: '2026-08-05', revenue: 2_000, cogs: 474.11, opex: 10_306.41, other: 0 }];

  test('la salida sigue siendo la suma, como la dibuja la gráfica', () => {
    const [p] = puntosDeSerie(SERIE, 'es', LABELS);
    expect(p!['Salidas']).toBeCloseTo(10_780.52, 2);
  });

  /*
   * La parte que arregla el reporte: sin esto, 10.780,52 no se puede cuadrar contra un Excel
   * que tiene la nómina en una hoja y el costo de ventas en otra.
   */
  test('y lleva las dos partes por separado, para poder cuadrarla', () => {
    const [p] = puntosDeSerie(SERIE, 'es', LABELS);
    expect(p!['_opex']).toBeCloseTo(10_306.41, 2); // la cifra que Jose vio en su Excel
    expect(p!['_cogs']).toBeCloseTo(474.11, 2); // lo que faltaba explicar
    expect(Number(p!['_cogs']) + Number(p!['_opex'])).toBeCloseTo(Number(p!['Salidas']), 6);
  });

  /*
   * Las claves NO son el rótulo traducido. Si lo fueran, cambiar una palabra del diccionario
   * rompería el desglose sin que nada fallara, y en inglés podrían chocar con el nombre de otra
   * serie del mismo chart.
   */
  test('las claves del desglose son estables, no traducidas', () => {
    const d = desgloseDeSalidas(LABELS);
    expect(d.partes.map((x) => x.clave)).toEqual(['_cogs', '_opex']);
    expect(d.serie).toBe('Salidas');
  });
});
