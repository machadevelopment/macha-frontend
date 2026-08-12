import { describe, expect, test } from 'bun:test';
import { parseFlagReason } from './flag-reason';

describe('parseFlagReason', () => {
  test('los códigos simples se leen tal cual', () => {
    expect(parseFlagReason('invalid_date')).toEqual({ code: 'invalid_date', raw: 'invalid_date' });
    expect(parseFlagReason('missing_counterparty')?.code).toBe('missing_counterparty');
  });

  test('low_confidence trae la confianza pegada con dos puntos', () => {
    expect(parseFlagReason('low_confidence:0.30')).toEqual({
      code: 'low_confidence',
      raw: 'low_confidence:0.30',
      confidence: 0.3,
    });
  });

  test('low_confidence sin número sigue siendo low_confidence', () => {
    // El porcentaje es un extra. La fila está marcada por confianza baja igual, y
    // perder el código por no poder leer el número sería peor que no mostrarlo.
    const parsed = parseFlagReason('low_confidence:');
    expect(parsed?.code).toBe('low_confidence');
    expect(parsed?.confidence).toBeUndefined();
  });

  test('missing_fx_rate trae moneda y fecha', () => {
    expect(parseFlagReason('missing_fx_rate:USD:2026-08-01')).toEqual({
      code: 'missing_fx_rate',
      raw: 'missing_fx_rate:USD:2026-08-01',
      quoteCurrency: 'USD',
      date: '2026-08-01',
    });
  });

  test('un código desconocido se degrada, no rompe', () => {
    // El backend puede agregar una regla antes que este frontend. La bandeja tiene que
    // seguir mostrando la fila y su motivo crudo, no quedarse en blanco.
    expect(parseFlagReason('regla_nueva_del_backend')).toEqual({
      code: null,
      raw: 'regla_nueva_del_backend',
    });
  });

  test('sin motivo devuelve null', () => {
    expect(parseFlagReason(null)).toBeNull();
    expect(parseFlagReason(undefined)).toBeNull();
    expect(parseFlagReason('   ')).toBeNull();
  });

  test('no confunde un prefijo con el código completo', () => {
    // `invalid_date_range` no es `invalid_date`: se parte por `:`, no por substring.
    expect(parseFlagReason('invalid_date_range')?.code).toBeNull();
  });
});
