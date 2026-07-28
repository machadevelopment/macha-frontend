import { intlLocale, type Locale } from '@/lib/i18n/config';

type Currency = 'GTQ' | 'USD';

/**
 * Centralized locale-aware formatting (design guide §11.5). ALWAYS show the explicit
 * currency code (GTQ/USD) — the model is multi-currency. Never format inline in components.
 *
 * `amount` accepts `string` because the backend's `numeric` columns (CLAUDE.md: money
 * is numeric, never float) serialize to JSON as decimal strings, not JS numbers — the
 * API contract, not just a defensive cast. `Intl.NumberFormat.format` handles numeric
 * strings natively (CU-868kfvb02).
 */
export function formatMoney(
  amount: number | string,
  currency: Currency,
  locale: Locale = 'es',
): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    style: 'currency',
    currency,
    currencyDisplay: 'code', // explicit GTQ/USD
  }).format(amount as number);
}

export function formatDate(date: Date | string, locale: Locale = 'es'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(intlLocale[locale], { dateStyle: 'medium' }).format(d);
}

export function formatPct(value: number, locale: Locale = 'es', fractionDigits = 1): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
