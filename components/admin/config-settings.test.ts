import { describe, expect, it } from 'bun:test';
import { draftFor, editorFor, parseSettingDraft } from './config-settings';

/**
 * Lo que se prueba aquí no es el control que se dibuja, sino el TIPO que sale hacia el
 * backend. `platform_settings.value` es jsonb y el PATCH guarda lo que reciba: si el
 * input numérico mandara `"1200"` en vez de `1200`, el panel se vería idéntico y el
 * ratio créditos↔tokens quedaría como texto. Ese es el error caro y silencioso.
 */
describe('editorFor', () => {
  it('usa input numérico para los parámetros que son cifras', () => {
    expect(editorFor('credit_to_tokens_ratio', 1200)).toBe('number');
    expect(editorFor('credit_price_usd_cents', 10)).toBe('number');
    expect(editorFor('intake_max_rows_per_file', 50000)).toBe('number');
  });

  it('deja como texto el prompt y el modelo', () => {
    expect(editorFor('insight_prompt_template', 'Eres un CFO…')).toBe('text');
    expect(editorFor('anthropic_model', 'claude-sonnet-5')).toBe('text');
  });

  it('degrada a texto un parámetro que no conoce, en vez de romper', () => {
    expect(editorFor('parametro_que_no_existe_todavia', 42)).toBe('text');
    expect(editorFor('parametro_que_no_existe_todavia', { a: 1 })).toBe('text');
  });

  it('respeta el tipo guardado: una key numérica con valor string se edita como texto', () => {
    expect(editorFor('credit_to_tokens_ratio', '1200')).toBe('text');
    expect(editorFor('credit_monthly_allotment', null)).toBe('text');
  });
});

describe('draftFor', () => {
  it('edita los strings planos, sin comillas ni escapes', () => {
    expect(draftFor('claude-sonnet-5')).toBe('claude-sonnet-5');
    expect(draftFor('linea 1\nlinea 2')).toBe('linea 1\nlinea 2');
  });

  it('deja un número listo para un input numérico', () => {
    expect(draftFor(1200)).toBe('1200');
  });

  it('serializa lo demás como JSON y nunca devuelve undefined', () => {
    expect(draftFor({ a: 1 })).toBe('{"a":1}');
    expect(draftFor(undefined)).toBe('');
  });
});

describe('parseSettingDraft', () => {
  it('manda un número, no un string, para un parámetro numérico', () => {
    const result = parseSettingDraft('credit_to_tokens_ratio', '1500', 1200);
    expect(result).toEqual({ ok: true, value: 1500 });
    expect(typeof (result as { value: unknown }).value).toBe('number');
  });

  it('acepta decimales y espacios alrededor', () => {
    expect(parseSettingDraft('credit_price_usd_cents', ' 12.5 ', 10)).toEqual({
      ok: true,
      value: 12.5,
    });
  });

  it('rechaza el campo numérico vacío en vez de guardar 0', () => {
    expect(parseSettingDraft('credit_price_usd_cents', '', 10)).toEqual({
      ok: false,
      reason: 'number',
    });
    expect(parseSettingDraft('credit_price_usd_cents', '   ', 10)).toEqual({
      ok: false,
      reason: 'number',
    });
  });

  it('rechaza lo que no es un número finito', () => {
    expect(parseSettingDraft('rate_limit_ai_rpm', 'abc', 60)).toEqual({
      ok: false,
      reason: 'number',
    });
    expect(parseSettingDraft('rate_limit_ai_rpm', 'Infinity', 60)).toEqual({
      ok: false,
      reason: 'number',
    });
  });

  it('manda el texto tal cual cuando el valor guardado es un string', () => {
    expect(parseSettingDraft('anthropic_model', 'claude-opus-5', 'claude-sonnet-5')).toEqual({
      ok: true,
      value: 'claude-opus-5',
    });
  });

  it('parsea como JSON lo que no es string ni numérico conocido', () => {
    expect(parseSettingDraft('feature_flags', '{"beta":true}', { beta: false })).toEqual({
      ok: true,
      value: { beta: true },
    });
  });

  it('reporta JSON inválido sin lanzar', () => {
    expect(parseSettingDraft('feature_flags', '{beta:', { beta: false })).toEqual({
      ok: false,
      reason: 'json',
    });
  });
});
