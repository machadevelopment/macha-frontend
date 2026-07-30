'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/format';

interface Setting {
  key: string;
  value: unknown;
  updatedAt: string;
}

interface SettingMeta {
  label: string;
  description: string;
  /** Alto del editor. Se omite para los parámetros de una sola línea. */
  rows?: number;
}

/**
 * CU-868khw0ng: el panel se alimenta de lo que devuelva el backend
 * (`platform_settings` completa), así que cualquier parámetro sin entrada acá salía
 * con la key cruda por título. El diccionario cubre las keys conocidas; para las que
 * aparezcan después está el fallback `humanizeSettingKey`, que degrada a algo legible
 * en vez de a `intake_max_rows_per_file`. La key real siempre se muestra debajo del
 * label: es el identificador con el que se opera el backend.
 */
const SETTINGS_META: Record<string, SettingMeta> = {
  credit_to_tokens_ratio: {
    label: 'Tokens por crédito (uso interno, no visible al cliente)',
    description:
      'Cuántos tokens de Claude representa un crédito al debitar consumo de IA. El cliente solo ve créditos, nunca tokens.',
  },
  credit_monthly_allotment: {
    label: 'Asignación mensual de créditos',
    description: 'Créditos que se acreditan a cada empresa al inicio de su ciclo mensual.',
  },
  credit_price_usd_cents: {
    label: 'Precio de venta del crédito (centavos de USD)',
    description:
      'Precio de un crédito en centavos de dólar. Valor provisional de F0: falta confirmarlo con el dueño del negocio.',
  },
  insight_prompt_template: {
    label: 'Prompt de insight (catálogo de prompts)',
    description:
      'Este texto es el prompt que se envía a Claude en cada insight. Al generarse un insight queda congelado en insight_requests.prompt_snapshot, así que editarlo afecta únicamente a los insights futuros: los ya emitidos conservan el prompt con el que se produjeron.',
    rows: 14,
  },
  intake_max_file_size_mb: {
    label: 'Tamaño máximo de archivo de ingesta (MB)',
    description:
      'Peso máximo aceptado por el Excel que sube el cliente. Arriba de esto se rechaza.',
  },
  intake_max_rows_per_file: {
    label: 'Filas máximas por archivo de ingesta',
    description: 'Tope de filas parseadas por documento antes de rechazar la ingesta.',
  },
  rate_limit_ai_rpm: {
    label: 'Llamadas de IA por minuto (por empresa)',
    description: 'Capacidad del token-bucket por empresa que limita las llamadas a Claude.',
  },
  anthropic_model: {
    label: 'Modelo de Claude',
    description:
      'Modelo usado en todas las llamadas de IA. Ante cualquier cambio hay que re-verificar la elegibilidad ZDR del modelo.',
  },
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
  const explicit = SETTINGS_META[key]?.rows;
  if (explicit) return explicit;
  if (draft.includes('\n') || draft.length > 120) return 8;
  return 1;
}

export function ConfigPanel() {
  const [settings, setSettings] = useState<Setting[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  function load() {
    fetch('/api/admin/config')
      .then((r) => r.json())
      .then((data: Setting[]) => {
        setSettings(data);
        // Strings edit as plain text (no surrounding JSON quotes/escapes); numbers
        // and anything else fall back to their JSON form.
        setDrafts(
          Object.fromEntries(
            data.map((s) => [
              s.key,
              typeof s.value === 'string' ? s.value : JSON.stringify(s.value),
            ]),
          ),
        );
      });
  }
  useEffect(load, []);

  async function save(key: string) {
    setSaving(key);
    try {
      const original = settings?.find((s) => s.key === key);
      const value = typeof original?.value === 'string' ? drafts[key] : JSON.parse(drafts[key]!);
      await fetch(`/api/admin/config/${key}`, {
        method: 'PATCH',
        body: JSON.stringify({ value }),
      });
      load();
    } finally {
      setSaving(null);
    }
  }

  if (!settings) return null;

  return (
    <div className="flex flex-col gap-3">
      {settings.map((s) => {
        const meta = SETTINGS_META[s.key];
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
                Actualizado {formatDate(s.updatedAt)}
              </p>
            )}
            <Button
              size="sm"
              className="mt-2"
              onClick={() => save(s.key)}
              disabled={saving === s.key}
            >
              {saving === s.key ? 'Guardando…' : 'Guardar'}
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
