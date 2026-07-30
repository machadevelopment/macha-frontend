import { describe, expect, it } from 'bun:test';
import { RULE_UNIT, RULE_UNIT_LABEL_ES, isKnownRule } from './rule-units';
import { getDictionary } from '@/lib/i18n/get-dictionary';

/**
 * CU-868khvzqn: el punto de extraer este mapa es que las tres pantallas que lo usan —
 * detalle de alerta, histórico y umbrales del backoffice — no se desincronicen. Estos
 * tests fijan lo que el tipo por sí solo no garantiza en runtime.
 */
describe('rule-units', () => {
  it('cubre exactamente las reglas del diccionario, en ambos idiomas', () => {
    // Si el backend agrega una regla y alguien la traduce sin darle unidad (o al revés),
    // acá se rompe. Es el modo de falla real: un umbral se muestra sin unidad, o con la
    // unidad de otra regla.
    for (const locale of ['es', 'en'] as const) {
      expect(Object.keys(RULE_UNIT).sort()).toEqual(
        Object.keys(getDictionary(locale).alerts.rule).sort(),
      );
    }
  });

  it('marca ar_overdue como días y el resto como porcentaje', () => {
    // El caso que motivó el ticket: `ar_overdue: 30` son días y
    // `portfolio_concentration: 35` es por ciento, y en el input se veían idénticos.
    expect(RULE_UNIT.ar_overdue).toBe('days');
    const others = Object.entries(RULE_UNIT).filter(([key]) => key !== 'ar_overdue');
    expect(others.every(([, unit]) => unit === 'percent')).toBe(true);
  });

  it('rechaza una regla desconocida en vez de indexar a undefined', () => {
    // Una regla que exista en el catálogo del backend pero todavía no acá tiene que
    // degradarse a "sin unidad", no colgar la pantalla.
    expect(isKnownRule('ar_overdue')).toBe(true);
    expect(isKnownRule('regla_que_no_existe')).toBe(false);
  });

  it('tiene etiqueta en español para cada unidad', () => {
    for (const unit of Object.values(RULE_UNIT)) {
      expect(RULE_UNIT_LABEL_ES[unit]).toBeTruthy();
    }
  });
});
