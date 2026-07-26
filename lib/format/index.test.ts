import { describe, expect, test } from 'bun:test';
import { formatDate, formatMoney, formatPct } from './index';

describe('formatMoney', () => {
  test('always shows the explicit currency code (design guide §11.5)', () => {
    expect(formatMoney(1234.5, 'GTQ', 'es')).toContain('GTQ');
    expect(formatMoney(1234.5, 'USD', 'en')).toContain('USD');
  });

  test('formats es/GTQ and en/USD without throwing', () => {
    expect(() => formatMoney(0, 'GTQ', 'es')).not.toThrow();
    expect(() => formatMoney(-500.25, 'USD', 'en')).not.toThrow();
  });
});

describe('formatDate', () => {
  test('accepts both Date objects and ISO strings', () => {
    const fromDate = formatDate(new Date('2026-01-15T00:00:00Z'), 'es');
    const fromString = formatDate('2026-01-15T00:00:00Z', 'es');
    expect(fromDate).toBe(fromString);
  });
});

describe('formatPct', () => {
  test('respects fractionDigits', () => {
    expect(formatPct(0.4321, 'en', 2)).toContain('43.21');
  });
});
