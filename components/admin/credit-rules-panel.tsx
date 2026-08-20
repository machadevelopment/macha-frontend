'use client';

import { useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import type { Dictionary } from '@/lib/i18n/dictionary';
import { AdminLoadError } from '@/components/admin/admin-load-error';
import { request, requestJson, type RequestError } from '@/lib/api/browser';
import { useResource } from '@/lib/api/use-resource';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface CreditRule {
  id: string;
  actionKind: string;
  ruleType: string;
  creditsPerUnit: string;
  unit: string | null;
  version: number;
  active: boolean;
}

export function CreditRulesPanel({
  labels,
  common,
}: {
  labels: Dictionary['admin']['creditRules'];
  common: Dictionary['admin']['common'];
}) {
  const [form, setForm] = useState({
    actionKind: 'insight',
    ruleType: 'fixed',
    creditsPerUnit: '1',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<RequestError | null>(null);

  // CU-868kkgb3c: ni la carga ni el alta miraban `res.ok`.
  const { state, reload } = useResource<CreditRule[]>(
    useCallback(() => request<CreditRule[]>('/api/admin/credit-rules'), []),
  );

  async function createRule() {
    setSaving(true);
    setSaveError(null);
    try {
      const result = await requestJson('/api/admin/credit-rules', 'POST', {
        ...form,
        creditsPerUnit: Number(form.creditsPerUnit),
      });
      if (!result.ok) {
        // Una regla de créditos define cuánto se le cobra a cada empresa por acción:
        // creer que se guardó una versión que no existe es peor que el propio fallo.
        setSaveError(result.error);
        return;
      }
      reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="mb-2 text-cardh2">{labels.newVersionTitle}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="creditRuleActionKind" className="text-body font-medium">
              Acción
            </label>
            <Select
              id="creditRuleActionKind"
              value={form.actionKind}
              onChange={(e) => setForm({ ...form, actionKind: e.target.value })}
            >
              <option value="excel">excel</option>
              <option value="chat">chat</option>
              <option value="insight">insight</option>
              <option value="report_generation">report_generation</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="creditRuleType" className="text-body font-medium">
              Tipo
            </label>
            <Select
              id="creditRuleType"
              value={form.ruleType}
              onChange={(e) => setForm({ ...form, ruleType: e.target.value })}
            >
              <option value="fixed">fixed</option>
              <option value="variable">variable</option>
            </Select>
          </div>
          <Field
            id="creditsPerUnit"
            label="Créditos por unidad"
            type="number"
            value={form.creditsPerUnit}
            onChange={(e) => setForm({ ...form, creditsPerUnit: e.target.value })}
          />
        </div>
        <Button size="sm" className="mt-3" onClick={createRule} disabled={saving}>
          {saving ? common.saving : labels.publishAction}
        </Button>
        {saveError && <AdminLoadError error={saveError} labels={common.loadError} />}
      </Card>

      <Card>
        {state.status === 'error' ? (
          <AdminLoadError error={state.error} labels={common.loadError} onRetry={reload} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.colAction}</TableHead>
                <TableHead>{labels.colType}</TableHead>
                <TableHead>{labels.colPerUnit}</TableHead>
                <TableHead>{labels.colVersion}</TableHead>
                <TableHead>{labels.colStatus}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.status === 'ready' &&
                state.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-eyebrow uppercase text-faint">
                      {r.actionKind}
                    </TableCell>
                    <TableCell>{r.ruleType}</TableCell>
                    <TableCell className="tabular-nums">
                      {r.creditsPerUnit} {r.unit ? `/ ${r.unit}` : ''}
                    </TableCell>
                    <TableCell className="tabular-nums">v{r.version}</TableCell>
                    <TableCell>
                      <Badge variant={r.active ? 'success' : 'neutral'}>
                        {r.active ? 'activa' : 'histórica'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
