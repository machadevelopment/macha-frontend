'use client';

import { useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import type { Dictionary } from '@/lib/i18n/dictionary';
import { AdminLoadError } from '@/components/admin/admin-load-error';
import { request, requestJson } from '@/lib/api/browser';
import { useResource } from '@/lib/api/use-resource';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/format';

interface Setting {
  key: string;
  value: unknown;
  updatedAt: string;
}

/**
 * CU-868khw0ng: el panel se alimenta de lo que devuelva el backend
 * (`platform_settings` completa), así que cualquier parámetro sin entrada acá salía
 * con la key cruda por título. El diccionario cubre las keys conocidas; para las que
 * aparezcan después está el fallback `humanizeSettingKey`, que degrada a algo legible
 * en vez de a `intake_max_rows_per_file`. La key real siempre se muestra debajo del
 * label: es el identificador con el que se opera el backend.
 */
/**
 * CU-868kh8zvt: los textos salían de un mapa en español acá. Ahora vienen del
 * diccionario (`t.admin.config.settings`), con paridad ES/EN. Lo que NO se traduce es
 * la key (`credit_to_tokens_ratio`): es el identificador real con el que se opera el
 * backend y se sigue mostrando cruda bajo el label.
 *
 * `rows` no es texto y por eso se queda acá: el prompt de insight necesita un textarea
 * alto y eso no cambia con el idioma.
 */
const SETTINGS_ROWS: Record<string, number> = {
  insight_prompt_template: 14,
};

/** Fallback para keys sin entrada en SETTINGS_META: `rate_limit_ai_rpm` → `Rate limit ai rpm`. */
function humanizeSettingKey(key: string): string {
  const words = key.replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Un parámetro nuevo que resulte ser texto largo (otro prompt, por ejemplo) no debería
 * caer en un editor de una línea solo por no estar en el diccionario todavía.
 */
function rowsFor(key: string, draft: string): number {
  const explicit = SETTINGS_ROWS[key];
  if (explicit) return explicit;
  if (draft.includes('\n') || draft.length > 120) return 8;
  return 1;
}

export function ConfigPanel({
  labels,
  common,
}: {
  labels: Dictionary['admin']['config'];
  common: Dictionary['admin']['common'];
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  /** Error por key: cada parámetro se guarda por separado. */
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});

  const { state, reload } = useResource<Setting[]>(
    useCallback(async () => {
      const result = await request<Setting[]>('/api/admin/config');
      if (result.ok) {
        // Strings edit as plain text (no surrounding JSON quotes/escapes); numbers
        // and anything else fall back to their JSON form.
        setDrafts(
          Object.fromEntries(
            result.data.map((s) => [
              s.key,
              typeof s.value === 'string' ? s.value : JSON.stringify(s.value),
            ]),
          ),
        );
      }
      return result;
    }, []),
  );

  const settings = state.status === 'ready' ? state.data : null;

  /**
   * CU-868kkgb3c: esto no miraba `res.ok`, así que un PATCH rechazado se veía igual que
   * uno exitoso — el spinner paraba y el panel recargaba mostrando el valor VIEJO. Acá
   * se editan cosas como el ratio de tokens por crédito y el precio de venta: creer que
   * se guardó un cambio de precio que no se guardó es un problema de dinero.
   *
   * Además `JSON.parse` podía lanzar con un draft malformado y dejar el botón colgado en
   * "Guardando…" para siempre; ahora se valida antes de salir a la red.
   */
  async function save(key: string) {
    const original = settings?.find((s) => s.key === key);
    let value: unknown;
    if (typeof original?.value === 'string') {
      value = drafts[key];
    } else {
      try {
        value = JSON.parse(drafts[key]!);
      } catch {
        setSaveErrors((prev) => ({ ...prev, [key]: labels.invalidJson }));
        return;
      }
    }

    setSaving(key);
    setSaveErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    try {
      const result = await requestJson(`/api/admin/config/${key}`, 'PATCH', { value });
      if (!result.ok) {
        setSaveErrors((prev) => ({
          ...prev,
          [key]: labels.saveError,
        }));
        return;
      }
      reload();
    } finally {
      setSaving(null);
    }
  }

  if (state.status === 'error')
    return <AdminLoadError error={state.error} labels={common.loadError} onRetry={reload} />;
  if (!settings) return null;

  return (
    <div className="flex flex-col gap-3">
      {settings.map((s) => {
        const meta = labels.settings[s.key];
        const draft = drafts[s.key] ?? '';
        return (
          <Card key={s.key}>
            <label htmlFor={`setting-${s.key}`} className="block text-cardh2">
              {meta?.label ?? humanizeSettingKey(s.key)}
            </label>
            <p className="font-mono text-eyebrow uppercase text-faint">{s.key}</p>
            {meta && <p className="mt-1 text-body text-muted-foreground">{meta.description}</p>}
            <Textarea
              id={`setting-${s.key}`}
              rows={rowsFor(s.key, draft)}
              className="mt-2 font-mono text-body"
              value={draft}
              onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })}
            />
            {s.updatedAt && (
              <p className="mt-1 font-mono text-eyebrow uppercase text-faint">
                {labels.updatedAt} {formatDate(s.updatedAt)}
              </p>
            )}
            <Button
              size="sm"
              className="mt-2"
              onClick={() => save(s.key)}
              disabled={saving === s.key}
            >
              {saving === s.key ? common.saving : common.save}
            </Button>
            {/* CU-868kkgb3c: el error va por parámetro, junto a su propio botón. */}
            {saveErrors[s.key] && <p className="mt-1 text-body text-danger">{saveErrors[s.key]}</p>}
          </Card>
        );
      })}
    </div>
  );
}
