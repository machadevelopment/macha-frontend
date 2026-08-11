/**
 * Lectura del `flag_reason` que marca una fila de staging (ronda de QA 2026-08-11).
 *
 * El backend guarda un CÓDIGO, no una frase: `invalid_date`, `low_confidence:0.30`,
 * `missing_fx_rate:USD:2026-08-01`. Está bien que lo haga —es un dato estable, indexable
 * y que no depende del idioma— pero la bandeja de revisión lo pintaba crudo, y el analista
 * tenía que traducir mentalmente códigos en inglés para decidir sobre la contabilidad real
 * de un cliente.
 *
 * Este módulo separa el parseo (acá, comprobable) de la redacción (el diccionario ES/EN).
 * Es el espejo de `src/lib/staging-rules.ts` y `src/lib/fx.ts` en macha-backend.
 *
 * OJO: la lista del ticket traía ocho códigos, pero el backend emite NUEVE. Falta
 * `missing_fx_rate`, que además es el único con una salida concreta —registrar la tasa en
 * Empresa › Tasas de cambio— así que es justo el que más gana con estar traducido.
 */

export const FLAG_REASON_CODES = [
  'low_confidence',
  'invalid_type',
  'missing_category',
  'invalid_date',
  'invalid_amount',
  'invalid_currency',
  'missing_counterparty',
  'invalid_issue_date',
  'missing_fx_rate',
] as const;

export type FlagReasonCode = (typeof FLAG_REASON_CODES)[number];

export interface ParsedFlagReason {
  /** `null` cuando el backend emite un código que este frontend todavía no conoce. */
  code: FlagReasonCode | null;
  /** El valor original, para poder mostrarlo cuando `code` es `null`. */
  raw: string;
  /** Solo en `low_confidence`: 0–1, tal cual lo escribió el backend. */
  confidence?: number;
  /** Solo en `missing_fx_rate`: la moneda que no se pudo convertir. */
  quoteCurrency?: string;
  /** Solo en `missing_fx_rate`: la fecha del movimiento sin tasa. */
  date?: string;
}

const CODES = new Set<string>(FLAG_REASON_CODES);

/**
 * Dos de los nueve códigos llevan datos pegados con `:` — `low_confidence:0.30` y
 * `missing_fx_rate:USD:2026-08-01`. Se parten por el PRIMER `:` y no por todos, porque la
 * fecha del segundo no lleva más separadores pero la forma podría crecer.
 */
export function parseFlagReason(raw: string | null | undefined): ParsedFlagReason | null {
  if (!raw || raw.trim() === '') return null;

  const value = raw.trim();
  const sep = value.indexOf(':');
  const head = sep === -1 ? value : value.slice(0, sep);
  const rest = sep === -1 ? '' : value.slice(sep + 1);

  if (!CODES.has(head)) return { code: null, raw: value };
  const code = head as FlagReasonCode;

  if (code === 'low_confidence') {
    // `Number('')` es 0, no `NaN`: sin el chequeo de vacío, un `low_confidence:` sin
    // número se mostraría como "confianza 0%", que es un dato inventado. `0.00` sí es un
    // valor legítimo que el backend puede emitir (escribe siempre `toFixed(2)`).
    const n = rest.trim() === '' ? Number.NaN : Number(rest);
    // Un valor ilegible no invalida el código: la fila SIGUE marcada por confianza baja,
    // solo que no se puede decir cuánta. Mostrar el porcentaje es un extra.
    return Number.isFinite(n) ? { code, raw: value, confidence: n } : { code, raw: value };
  }

  if (code === 'missing_fx_rate') {
    const [quoteCurrency, date] = rest.split(':');
    return {
      code,
      raw: value,
      ...(quoteCurrency ? { quoteCurrency } : {}),
      ...(date ? { date } : {}),
    };
  }

  return { code, raw: value };
}
