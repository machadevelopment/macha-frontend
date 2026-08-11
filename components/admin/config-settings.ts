/**
 * CU-B7-QA-20260811: qué control edita cada parámetro de `platform_settings`, y cómo
 * se convierte lo tecleado en el valor que viaja en el PATCH.
 *
 * Vive fuera del componente por lo mismo que `components/product-sales/summary.ts`:
 * es lógica pura sobre números que mueven dinero (el ratio créditos↔tokens, el precio
 * de venta del crédito) y se puede probar sin montar React.
 *
 * `platform_settings.value` es `jsonb`, así que el backend no impone un tipo por key:
 * lo que llegue es lo que había. Por eso el editor NO se decide solo por la key —
 * también por el tipo del valor recibido. Si algún día una de estas keys guardara un
 * string, se seguiría editando como texto y el PATCH devolvería un string: preservar
 * el tipo que ya está en la fila es más seguro que imponer el que creemos correcto.
 */

/**
 * Parámetros que son cifras y no texto. La lista es explícita a propósito: adivinar
 * "es número si el valor actual es número" convertiría en input numérico cualquier
 * parámetro futuro que casualmente arranque con un número — incluido uno que en
 * realidad acepte un objeto o un arreglo, donde el input numérico sería una trampa.
 *
 * Un parámetro que no esté aquí degrada a textarea, que es el editor que sirve para
 * cualquier JSON. Nada se rompe por no conocer una key nueva.
 */
const NUMERIC_SETTING_KEYS = new Set([
  'credit_to_tokens_ratio',
  'credit_monthly_allotment',
  'credit_initial_grant',
  'credit_price_usd_cents',
  'intake_max_file_size_mb',
  'intake_max_rows_per_file',
  'rate_limit_ai_rpm',
]);

export type SettingEditor = 'number' | 'text';

export function editorFor(key: string, value: unknown): SettingEditor {
  return NUMERIC_SETTING_KEYS.has(key) && typeof value === 'number' ? 'number' : 'text';
}

/**
 * Valor recibido → texto editable. Los strings se editan planos (sin las comillas ni
 * los escapes de su forma JSON, que es lo que un operador teclearía por error); todo
 * lo demás se edita en su forma JSON. Para un número eso da `"1200"`, exactamente lo
 * que un `<input type="number">` espera como `value`.
 */
export function draftFor(value: unknown): string {
  return typeof value === 'string' ? value : (JSON.stringify(value) ?? '');
}

export type ParsedDraft = { ok: true; value: unknown } | { ok: false; reason: 'number' | 'json' };

/**
 * Texto editado → valor del PATCH. El caso numérico devuelve un **número**, no un
 * string: `platform_settings` es jsonb y el backend guarda tal cual lo que reciba, así
 * que mandar `"1200"` dejaría el ratio como texto y quien lo lea después haría
 * aritmética contra un string.
 *
 * `Number('')` es 0 — de ahí el chequeo del vacío antes de convertir. Es un caso real,
 * no defensivo: un `<input type="number">` reporta `''` cuando su contenido no es un
 * número válido para el navegador, y guardar un 0 silencioso en el precio del crédito
 * o en el ratio de tokens es justo el error que no se ve hasta que factura mal.
 */
export function parseSettingDraft(key: string, draft: string, original: unknown): ParsedDraft {
  if (editorFor(key, original) === 'number') {
    const trimmed = draft.trim();
    const parsed = Number(trimmed);
    if (trimmed === '' || !Number.isFinite(parsed)) return { ok: false, reason: 'number' };
    return { ok: true, value: parsed };
  }

  if (typeof original === 'string') return { ok: true, value: draft };

  try {
    return { ok: true, value: JSON.parse(draft) };
  } catch {
    return { ok: false, reason: 'json' };
  }
}
