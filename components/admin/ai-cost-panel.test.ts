import { describe, expect, test } from 'bun:test';
import { agrupar, tasaCache, type CostRow } from './ai-cost-panel';

/**
 * CU-868krkatv — la agrupación maestro-detalle del panel de costo de IA.
 *
 * Se prueba la función pura y no el render: lo que puede salir MAL acá son números, y un
 * número equivocado en esta pantalla es un operador facturando de menos a un cliente. El
 * árbol de `<tr>` no es donde vive ese riesgo.
 */

function fila(over: Partial<CostRow> & Pick<CostRow, 'companyId' | 'kind'>): CostRow {
  return {
    companyName: `Empresa ${over.companyId}`,
    totalCostUsd: '0',
    totalInputTokens: '0',
    totalOutputTokens: '0',
    totalCacheReadTokens: '0',
    totalCacheCreationTokens: '0',
    cacheHitRate: null,
    callCount: '0',
    ...over,
  };
}

describe('agrupar', () => {
  test('una fila por empresa, con el total sumado de sus tipos de acción', () => {
    const [empresa] = agrupar([
      fila({ companyId: 'a', kind: 'excel', totalCostUsd: '2', callCount: '10' }),
      fila({ companyId: 'a', kind: 'chat', totalCostUsd: '1', callCount: '4' }),
      fila({ companyId: 'a', kind: 'report_generation', totalCostUsd: '0.5', callCount: '1' }),
    ]);

    // El ejemplo textual del ticket: Excel $2, Chat $1, Reporte $0.5.
    expect(empresa!.costUsd).toBe(3.5);
    expect(empresa!.callCount).toBe(15);
    expect(empresa!.detalle).toHaveLength(3);
  });

  test('las empresas salen de mayor a menor consumo', () => {
    const empresas = agrupar([
      fila({ companyId: 'barata', kind: 'chat', totalCostUsd: '0.10' }),
      fila({ companyId: 'cara', kind: 'excel', totalCostUsd: '40' }),
      fila({ companyId: 'media', kind: 'excel', totalCostUsd: '7' }),
    ]);
    expect(empresas.map((e) => e.companyId)).toEqual(['cara', 'media', 'barata']);
  });

  test('dentro de una empresa, el desglose también va de mayor a menor', () => {
    const [empresa] = agrupar([
      fila({ companyId: 'a', kind: 'chat', totalCostUsd: '1' }),
      fila({ companyId: 'a', kind: 'excel', totalCostUsd: '2' }),
      fila({ companyId: 'a', kind: 'insight', totalCostUsd: '0.5' }),
    ]);
    expect(empresa!.detalle.map((d) => d.kind)).toEqual(['excel', 'chat', 'insight']);
  });
});

describe('tasaCache', () => {
  /**
   * El caso que motivó recalcular en vez de promediar. Promediando las tasas de las dos
   * filas saldría (90 % + 10 %) / 2 = 50 %, que no describe nada: casi toda la entrada de
   * esta empresa es la del `excel`, así que su tasa real está pegada al 10 %.
   */
  test('pondera por tokens, no promedia las tasas de cada tipo', () => {
    const [empresa] = agrupar([
      fila({
        companyId: 'a',
        kind: 'chat',
        totalInputTokens: '10',
        totalCacheReadTokens: '90',
        cacheHitRate: 0.9,
      }),
      fila({
        companyId: 'a',
        kind: 'excel',
        totalInputTokens: '900000',
        totalCacheReadTokens: '100000',
        cacheHitRate: 0.1,
      }),
    ]);

    const tasa = tasaCache(empresa!)!;
    expect(tasa).toBeGreaterThan(0.09);
    expect(tasa).toBeLessThan(0.11);
  });

  test('sin entrada registrada devuelve null, no 0', () => {
    const [empresa] = agrupar([fila({ companyId: 'a', kind: 'chat' })]);
    // 0 % se leería como "el caché nunca pegó"; la verdad es que no hay con qué decirlo.
    expect(tasaCache(empresa!)).toBeNull();
  });
});
