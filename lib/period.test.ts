import { describe, expect, test } from 'bun:test';
import { computeRange } from './period';

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
