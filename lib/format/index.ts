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

/** Fecha sin hora, tal como serializa una columna `DATE` de Postgres: `2026-06-01`. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * CU-868khvyt6: una fecha date-only se corría un día hacia atrás.
 *
 * `new Date('2026-06-01')` se parsea como **medianoche UTC** (comportamiento que la
 * especificación de ECMAScript fija para el formato date-only), y `Intl.DateTimeFormat`
 * la renderizaba en la zona local del navegador. En Guatemala (UTC−6) esa medianoche
 * cae a las 18:00 del día anterior, así que el reporte de junio (`periodStart`
 * `2026-06-01`) se mostraba como "31 de mayo".
 *
 * Una fecha date-only **no representa un instante**, representa un día de calendario:
 * no tiene zona horaria que convertir. Por eso se formatea en UTC, la misma zona en la
 * que se parseó — así el día que sale es el día que mandó el backend, en cualquier
 * huso del cliente.
 *
 * Los `timestamptz` (`createdAt`/`updatedAt`) sí son instantes y se siguen mostrando en
 * la zona local del usuario, que es lo correcto para ellos.
 */
export function formatDate(date: Date | string, locale: Locale = 'es'): string {
  const isDateOnly = typeof date === 'string' && DATE_ONLY.test(date);
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(intlLocale[locale], {
    dateStyle: 'medium',
    ...(isDateOnly ? { timeZone: 'UTC' } : {}),
  }).format(d);
}

export function formatPct(value: number, locale: Locale = 'es', fractionDigits = 1): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
