import { describe, expect, test } from 'bun:test';
import { computeRange, localIsoDate, validateCustomRange } from './period';

/** Jueves 6 de agosto de 2026, en hora local. */
const HOY = new Date(2026, 7, 6);

describe('computeRange (filtro de período)', () => {
  test('hoy es un solo día', () => {
    expect(computeRange('today', HOY)).toEqual({ from: '2026-08-06', to: '2026-08-06' });
  });

  test('la semana va de lunes a domingo', () => {
    // El 6 de agosto de 2026 es jueves; su semana empieza el lunes 3.
    // Con domingo como primer día, el lunes de trabajo caería en la semana anterior.
    expect(computeRange('week', HOY)).toEqual({ from: '2026-08-03', to: '2026-08-09' });
  });

  test('el lunes pertenece a su propia semana, no a la anterior', () => {
    const lunes = new Date(2026, 7, 3);
    expect(computeRange('week', lunes).from).toBe('2026-08-03');
  });

  test('el domingo cierra la semana en curso', () => {
    const domingo = new Date(2026, 7, 9);
    expect(computeRange('week', domingo)).toEqual({ from: '2026-08-03', to: '2026-08-09' });
  });

  test('el mes termina el último día real, sin tabla de 30/31', () => {
    expect(computeRange('month', HOY)).toEqual({ from: '2026-08-01', to: '2026-08-31' });
    expect(computeRange('month', new Date(2026, 1, 15))).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
    // 2028 es bisiesto: el 29 tiene que aparecer sin código especial.
    expect(computeRange('month', new Date(2028, 1, 15)).to).toBe('2028-02-29');
  });

  test('el año va del 1 de enero al 31 de diciembre', () => {
    expect(computeRange('year', HOY)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });

  test('usa la fecha LOCAL y no UTC', () => {
    // Un dueño en Guatemala (UTC-6) a las 8 de la noche ya está en el día siguiente
    // según UTC. Si el rango se calculara en UTC, vería otro día durante seis horas.
    const nocheEnGuatemala = new Date(2026, 7, 6, 20, 30);
    expect(computeRange('today', nocheEnGuatemala)).toEqual({
      from: '2026-08-06',
      to: '2026-08-06',
    });
  });
});

describe('localIsoDate', () => {
  test('emite YYYY-MM-DD en local, con cero a la izquierda', () => {
    expect(localIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  test('no corre la fecha de noche en UTC-6', () => {
    // `toISOString()` sobre esto devolvería '2026-08-07' en Guatemala.
    expect(localIsoDate(new Date(2026, 7, 6, 20, 30))).toBe('2026-08-06');
  });
});

describe('validateCustomRange (CU-868knx137)', () => {
  test('acepta un rango normal', () => {
    expect(validateCustomRange('2026-08-01', '2026-08-05', HOY)).toBeNull();
  });

  test('acepta un rango de un solo día', () => {
    // Es lo que pide quien quiere ver un día puntual, y es lo mismo que devuelve
    // computeRange('today'). No es un caso degenerado.
    expect(validateCustomRange('2026-08-05', '2026-08-05', HOY)).toBeNull();
  });

  test('rechaza la fecha final anterior a la inicial', () => {
    expect(validateCustomRange('2026-08-05', '2026-08-01', HOY)).toBe('reversed');
  });

  test('rechaza cualquiera de las dos fechas vacía', () => {
    expect(validateCustomRange('', '2026-08-05', HOY)).toBe('incomplete');
    expect(validateCustomRange('2026-08-01', '', HOY)).toBe('incomplete');
  });

  test('rechaza el rango futuro', () => {
    expect(validateCustomRange('2026-08-01', '2026-08-07', HOY)).toBe('future');
  });

  test('hoy mismo NO es futuro', () => {
    // El borde exacto: `to === hoy` tiene que pasar. Si se comparara con `>=`, el
    // usuario nunca podría incluir el día en curso.
    expect(validateCustomRange('2026-08-01', '2026-08-06', HOY)).toBeNull();
  });

  test('un inicio futuro sale por reversed, no se cuela', () => {
    expect(validateCustomRange('2026-09-01', '2026-08-06', HOY)).toBe('reversed');
  });

  test('el orden de texto y el cronológico coinciden a través del cambio de año', () => {
    // La validación compara los YYYY-MM-DD como strings. Este es el caso donde una
    // comparación ingenua se rompería si el formato no llevara ceros a la izquierda.
    expect(validateCustomRange('2025-12-31', '2026-01-01', HOY)).toBeNull();
    expect(validateCustomRange('2026-01-01', '2025-12-31', HOY)).toBe('reversed');
  });

  test('no depende de la hora del día', () => {
    // Con `new Date('2026-08-06')` (medianoche UTC) el 6 de agosto habría sido "futuro"
    // en Guatemala durante seis horas cada noche.
    const nocheEnGuatemala = new Date(2026, 7, 6, 23, 59);
    expect(validateCustomRange('2026-08-06', '2026-08-06', nocheEnGuatemala)).toBeNull();
  });
});
