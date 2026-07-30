import { describe, expect, test } from 'bun:test';
import { formatDate, formatMoney, formatNumber, formatPct } from './index';

describe('formatMoney', () => {
  test('always shows the explicit currency code (design guide §11.5)', () => {
    expect(formatMoney(1234.5, 'GTQ', 'es')).toContain('GTQ');
    expect(formatMoney(1234.5, 'USD', 'en')).toContain('USD');
  });

  test('formats es/GTQ and en/USD without throwing', () => {
    expect(() => formatMoney(0, 'GTQ', 'es')).not.toThrow();
    expect(() => formatMoney(-500.25, 'USD', 'en')).not.toThrow();
  });

  test('accepts a numeric string (contract with backend numeric columns, CU-868kfvb02)', () => {
    expect(formatMoney('1234.50', 'GTQ', 'es')).toBe(formatMoney(1234.5, 'GTQ', 'es'));
  });

  test('numeric string and number produce identical output for a negative amount', () => {
    expect(formatMoney('-500.25', 'USD', 'en')).toBe(formatMoney(-500.25, 'USD', 'en'));
  });

  // CU-868khw0ng: el costo de IA se mostraba como `$18.4200` (símbolo pelado, ambiguo
  // en un producto GTQ+USD). Con código explícito y sin perder los 4 decimales.
  test('fractionDigits conserva la precisión sin perder el código de moneda', () => {
    const out = formatMoney('18.42', 'USD', 'es', { fractionDigits: 4 });
    expect(out).toContain('USD');
    expect(out).toContain('18.4200');
    expect(out).not.toContain('$');
  });

  test('sin fractionDigits se mantienen los decimales por defecto de la moneda', () => {
    expect(formatMoney(18.42, 'USD', 'es')).toBe(formatMoney(18.42, 'USD', 'es', {}));
    expect(formatMoney(18.42, 'USD', 'es')).not.toContain('18.4200');
  });
});

describe('formatNumber', () => {
  // CU-868khw0ng: los tokens de `/admin/ai-cost` salían como `4120400`.
  test('agrupa miles', () => {
    expect(formatNumber(4120400, 'en')).toBe('4,120,400');
  });

  test('acepta el string numérico que manda el backend', () => {
    expect(formatNumber('4120400', 'en')).toBe(formatNumber(4120400, 'en'));
  });

  test('por defecto no muestra decimales', () => {
    expect(formatNumber(1234.56, 'en')).toBe('1,235');
    expect(formatNumber(1234.56, 'en', 2)).toBe('1,234.56');
  });
});

describe('formatDate', () => {
  test('accepts both Date objects and ISO strings', () => {
    const fromDate = formatDate(new Date('2026-01-15T00:00:00Z'), 'es');
    const fromString = formatDate('2026-01-15T00:00:00Z', 'es');
    expect(fromDate).toBe(fromString);
  });

  // CU-868khvyt6: `new Date('2026-06-01')` es medianoche UTC; renderizada en la zona
  // local de Guatemala (UTC−6) caía al día anterior. Estos casos fallan con la
  // implementación previa (devolvían 31 may / 31 dic) en cualquier huso al oeste de UTC.
  test('una fecha date-only conserva su día de calendario (no retrocede)', () => {
    expect(formatDate('2026-06-01', 'en')).toContain('1');
    expect(formatDate('2026-06-01', 'en')).toContain('Jun');
    expect(formatDate('2026-06-30', 'en')).toContain('30');
    expect(formatDate('2026-06-30', 'en')).toContain('Jun');
  });

  test('date-only no cruza el año hacia atrás', () => {
    // periodStart de un reporte trimestral: si retrocede, cae en diciembre de 2025.
    expect(formatDate('2026-01-01', 'en')).toContain('2026');
    expect(formatDate('2026-01-01', 'en')).toContain('Jan');
  });

  test('un timestamp con hora sigue interpretándose como instante, no como día suelto', () => {
    // No lleva timeZone: 'UTC' — se renderiza en la zona del cliente, que es lo correcto
    // para un timestamptz. Solo se comprueba que sigue siendo determinista y no lanza.
    expect(() => formatDate('2026-06-15T14:30:00Z', 'es')).not.toThrow();
    expect(formatDate('2026-06-15T14:30:00Z', 'es')).toBe(
      formatDate(new Date('2026-06-15T14:30:00Z'), 'es'),
    );
  });
});

describe('formatPct', () => {
  test('respects fractionDigits', () => {
    expect(formatPct(0.4321, 'en', 2)).toContain('43.21');
  });
});
