import type { CurrencyCompositionResponse, CurrencyBreakdownRow } from '@/lib/api/dashboard';

/**
 * Las decisiones de la tarjeta de moneda, fuera del componente (CU-868kj3gnv).
 *
 * Viven acá porque son lo único de esta pantalla que puede estar MAL sin que nada se vea
 * roto: la tarjeta se pinta igual de bien con una tasa que no se aplicó a esas filas.
 */

/**
 * ¿Hubo UNA sola tasa en el período, o varias?
 *
 * Importa porque cambia lo que se le puede prometer al cliente. Con una sola tasa, el
 * consolidado se reproduce multiplicando y la interfaz puede decir "tasa aplicada: 7,72".
 * Con varias, esa misma frase es falsa: en el caso real de tres tasas en un mes, 600 USD no
 * son 600 × 7,72 sino 4.643, y un cliente que multiplique va a creer que el dashboard está
 * mal. Ahí hay que decir que fue un rango.
 *
 * Se compara con tolerancia porque `numeric(18,8)` vuelve de Postgres como string y dos
 * tasas idénticas pueden diferir en el último bit al pasar por `Number`.
 */
export function tasaUnica(rate: NonNullable<CurrencyBreakdownRow['rate']>): boolean {
  return Math.abs(rate.max - rate.min) < 1e-8;
}

/**
 * Las monedas distintas de la base que de verdad hay que mostrar.
 *
 * No se filtra por `multiCurrency` acá: esa bandera decide si la tarjeta EXISTE (la manda el
 * backend, para que dashboard y reportes coincidan). Esto decide qué filas se pintan dentro.
 */
export function monedasExtranjeras(data: CurrencyCompositionResponse): CurrencyBreakdownRow[] {
  return data.rows.filter((r) => r.currency !== data.baseCurrency && r.rate !== null);
}

/** La fila de la moneda base, si el período tuvo movimiento en ella. */
export function filaBase(data: CurrencyCompositionResponse): CurrencyBreakdownRow | undefined {
  return data.rows.find((r) => r.currency === data.baseCurrency);
}
