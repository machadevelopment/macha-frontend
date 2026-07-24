import { intlLocale, type Locale } from '@/lib/i18n/config';

type Currency = 'GTQ' | 'USD';

/**
 * Centralized locale-aware formatting (design guide §11.5). ALWAYS show the explicit
 * currency code (GTQ/USD) — the model is multi-currency. Never format inline in components.
 */
export function formatMoney(amount: number, currency: Currency, locale: Locale = 'es'): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    style: 'currency',
    currency,
    currencyDisplay: 'code', // explicit GTQ/USD
  }).format(amount);
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
