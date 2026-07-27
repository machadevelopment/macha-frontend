'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Setting {
  key: string;
  value: unknown;
  updatedAt: string;
}

const LABELS: Record<string, string> = {
  credit_to_tokens_ratio: 'Tokens por crédito (uso interno, no visible al cliente)',
  credit_monthly_allotment: 'Asignación mensual de créditos',
  insight_prompt_template: 'Prompt del catálogo de insight',
};

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
      {settings.map((s) => (
        <Card key={s.key}>
          <p className="text-cardh2">{LABELS[s.key] ?? s.key}</p>
          <Textarea
            rows={s.key === 'insight_prompt_template' ? 6 : 1}
            className="mt-2 font-mono text-body"
            value={drafts[s.key] ?? ''}
            onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })}
          />
          <Button
            size="sm"
            className="mt-2"
            onClick={() => save(s.key)}
            disabled={saving === s.key}
          >
            {saving === s.key ? 'Guardando…' : 'Guardar'}
          </Button>
        </Card>
      ))}
    </div>
  );
}
