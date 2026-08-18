import { describe, expect, test } from 'bun:test';
import { unaPorRegla } from '@/components/dashboard/una-por-regla';

/**
 * CU-868ktkp9w. El caso que llegó en la captura de QA: el rail mostraba cuatro alertas y
 * en realidad eran dos problemas repetidos.
 */
describe('unaPorRegla', () => {
  test('se queda con la primera de cada regla y descarta las repeticiones', () => {
    // Tal cual la captura: dos reglas, cada una dos veces, misma fecha y mismo valor.
    const items = [
      { id: '1', ruleKey: 'revenue_drop' },
      { id: '2', ruleKey: 'margin_drop' },
      { id: '3', ruleKey: 'revenue_drop' },
      { id: '4', ruleKey: 'margin_drop' },
    ];

    expect(unaPorRegla(items).map((a) => a.id)).toEqual(['1', '2']);
  });

  test('conserva el orden de llegada, que es el de fecha descendente de la API', () => {
    // Si reordenara, la alerta más nueva podría dejar de ser la primera del rail sin que
    // nada lo delate: las cuatro filas se ven igual de plausibles.
    const items = [
      { id: 'nueva', ruleKey: 'ar_overdue' },
      { id: 'otra', ruleKey: 'low_credit_balance' },
      { id: 'vieja', ruleKey: 'ar_overdue' },
    ];

    expect(unaPorRegla(items).map((a) => a.id)).toEqual(['nueva', 'otra']);
  });

  test('no toca una lista que ya viene sin repetidos', () => {
    const items = [
      { id: '1', ruleKey: 'revenue_drop' },
      { id: '2', ruleKey: 'margin_drop' },
    ];

    expect(unaPorRegla(items)).toEqual(items);
  });

  test('una lista vacía no revienta', () => {
    expect(unaPorRegla([])).toEqual([]);
  });
});
