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
  options: { fractionDigits?: number } = {},
): string {
  const { fractionDigits } = options;
  return new Intl.NumberFormat(intlLocale[locale], {
    style: 'currency',
    currency,
    currencyDisplay: 'code', // explicit GTQ/USD
    // CU-868khw0ng: por defecto se respetan los decimales de la moneda (2 para
    // GTQ/USD). `fractionDigits` es para el único caso donde eso no alcanza: el
    // costo unitario de IA en `/admin/ai-cost`, del orden de USD 0.0004 por
    // llamada, que con 2 decimales se redondea a cero. Sigue mostrando el código
    // de moneda — lo que cambia es la precisión, nunca el `currencyDisplay`.
    ...(fractionDigits === undefined
      ? {}
      : { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }),
  }).format(amount as number);
}

/**
 * CU-868khw0ng: enteros con separadores de miles (`4,120,400`).
 *
 * Nace de los contadores de tokens de `/admin/ai-cost`, las cifras más grandes del
 * producto, que se imprimían crudas (`4120400`). No es dinero — no lleva código de
 * moneda — pero sí es un número que el usuario lee, así que pasa por el mismo
 * formateo centralizado y locale-aware que el resto (nunca `Intl.*` inline).
 *
 * Acepta `string` por el mismo contrato que `formatMoney`: las columnas `numeric` /
 * los `count()` del backend serializan a JSON como strings decimales.
 */
export function formatNumber(
  value: number | string,
  locale: Locale = 'es',
  fractionDigits = 0,
): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value as number);
}

/**
 * CU-868khvyqa: variante compacta para los **ejes de los charts**, donde no cabe el
 * monto completo.
 *
 * `formatMoney` produce `GTQ 145,100.00` (~14 caracteres). Con el ancho por defecto del
 * eje Y de Tremor (~56px) en JetBrains Mono, todas las etiquetas se recortaban por la
 * izquierda y quedaban en `000.00`: los dos charts del dashboard perdían la escala por
 * completo. Esto devuelve `GTQ 145 k`.
 *
 * **DÓNDE SE PUEDE USAR, corregido el 2026-08-07.** Antes esta nota decía "solo para ejes" y
 * prohibía explícitamente los KPIs. La regla de fondo —que el usuario nunca tenga que salir de
 * la pantalla para ver la cifra completa con su código de moneda— no cambia; lo que cambia es
 * que abreviar y mostrar el exacto no son excluyentes:
 *
 *  · Ejes de charts: abreviado, y el exacto lo da el tooltip.
 *  · Tarjetas de KPI: abreviado como valor principal **siempre acompañado de la cifra exacta**
 *    en la línea de abajo (la prop `exact` de `KpiCard` existe para eso). Sin el exacto al
 *    lado, sigue prohibido.
 *  · Tablas y reportes: `formatMoney`, el monto completo. Ahí hay ancho y la comparación
 *    columna a columna necesita todos los dígitos.
 *
 * Lo que forzó la corrección: con datos reales, `GTQ 480,663.00` a 24px en JetBrains Mono mide
 * ~192px y la tarjeta de KPI tiene ~170px útiles (el rail derecho del dashboard se lleva 348).
 * El monto no cabía y se desbordaba PINTÁNDOSE sobre la tarjeta vecina, así que la regla vieja
 * no estaba protegiendo la cifra completa: estaba produciendo dos cifras ilegibles.
 */
export function formatMoneyCompact(
  amount: number | string,
  currency: Currency,
  locale: Locale = 'es',
): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    notation: 'compact',
    maximumFractionDigits: 1,
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

/**
 * Etiqueta CORTA de fecha para el eje de un chart de tendencia — CU-868kt8yy6.
 *
 * `formatDate` (arriba) usa `dateStyle: 'medium'` a propósito: es para donde el usuario LEE
 * una fecha puntual ("Vence el 15 de junio de 2026") y ahí sobra ancho. Un eje X no es ese
 * caso — son hasta 45 marcas seguidas (el `UMBRAL_DIAS_MENSUAL` de
 * `lib/metrics/series-grouping.ts`) y "15 de junio de 2026" repetido esas veces es
 * ilegible mucho antes de que se encimen: es exactamente la queja de Macha ("poner la
 * fecha más fácil de entender").
 *
 * `granularidad` decide la forma, no un flag de estilo aparte: un punto DIARIO se lee
 * "día + mes" (`15 jun`, dentro de un rango de un mes no hace falta el año) y un punto
 * MENSUAL (ya agrupado por `agruparPorMes`) se lee "mes" solo — mostrar el `01` que le puso
 * la agrupación como si fuera el día de una venta sería inventarle precisión al dato que no
 * tiene: el punto es TODO agosto, no el 1 de agosto.
 *
 * `conAnio` es la excepción, no la regla: los presets fijos (semana/mes/trimestre/año)
 * nunca cruzan un límite de año hacia atrás y adelante a la vez, pero un rango
 * PERSONALIZADO sí puede (de nov-2025 a mar-2026), y ahí dos eneros sin año serían
 * ambiguos. El llamador decide comparando el año de `from` contra el de `to`.
 */
export function formatDateAxis(
  date: string,
  locale: Locale = 'es',
  granularidad: 'day' | 'month' = 'day',
  options: { conAnio?: boolean } = {},
): string {
  const { conAnio = false } = options;
  const d = new Date(`${date}T00:00:00Z`);
  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: 'UTC',
    day: granularidad === 'day' ? 'numeric' : undefined,
    month: 'short',
    year: conAnio ? '2-digit' : undefined,
  }).format(d);
}

export function formatPct(value: number, locale: Locale = 'es', fractionDigits = 1): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
