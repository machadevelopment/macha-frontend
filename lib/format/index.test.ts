import { describe, expect, test } from 'bun:test';
import { formatDate, formatDateAxis, formatMoney, formatNumber, formatPct } from './index';

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

// CU-868kt8yy6: el eje de la gráfica de tendencia mostraba la fecha ISO cruda
// (`2026-08-18`). Estos son los formatos cortos que la reemplazan.
describe('formatDateAxis', () => {
  test('día: incluye día y mes, sin año', () => {
    const out = formatDateAxis('2026-08-18', 'en', 'day');
    expect(out).toContain('18');
    expect(out).toMatch(/Aug/i);
    expect(out).not.toContain('2026');
  });

  test('mes: solo el mes, sin el día que le puso la agrupación', () => {
    // `agruparPorMes` marca cada punto con el día 1 (`YYYY-MM-01`); mostrarlo confundiría
    // "todo agosto" con "el 1 de agosto".
    const out = formatDateAxis('2026-08-01', 'en', 'month');
    expect(out).not.toContain('1');
    expect(out).toMatch(/Aug/i);
  });

  test('conAnio desambigua un rango personalizado que cruza años', () => {
    const enero26 = formatDateAxis('2026-01-01', 'en', 'month', { conAnio: true });
    const enero25 = formatDateAxis('2025-01-01', 'en', 'month', { conAnio: true });
    expect(enero26).not.toBe(enero25);
    expect(enero26).toContain('26');
    expect(enero25).toContain('25');
  });

  test('sin conAnio (default), dos eneros de años distintos se ven iguales', () => {
    // Es la premisa que justifica que el llamador decida `conAnio` comparando años, no un
    // default siempre-true: los presets fijos nunca cruzan un año y agregarlo ahí sería
    // ruido en las doce etiquetas de la vista anual.
    expect(formatDateAxis('2026-01-01', 'en', 'month')).toBe(
      formatDateAxis('2025-01-01', 'en', 'month'),
    );
  });

  test('una fecha date-only no retrocede un día (mismo cuidado que formatDate)', () => {
    expect(formatDateAxis('2026-06-01', 'en', 'day')).toContain('1');
    expect(formatDateAxis('2026-06-30', 'en', 'day')).toContain('30');
  });

  test('es-GT produce un mes abreviado en español', () => {
    expect(formatDateAxis('2026-08-01', 'es', 'month').toLowerCase()).toContain('ago');
  });
});

describe('formatPct', () => {
  test('respects fractionDigits', () => {
    expect(formatPct(0.4321, 'en', 2)).toContain('43.21');
  });
});
