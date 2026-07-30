'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
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

export function CreditRulesPanel() {
  const [rules, setRules] = useState<CreditRule[] | null>(null);
  const [form, setForm] = useState({
    actionKind: 'insight',
    ruleType: 'fixed',
    creditsPerUnit: '1',
  });
  const [saving, setSaving] = useState(false);

  function load() {
    fetch('/api/admin/credit-rules')
      .then((r) => r.json())
      .then(setRules);
  }
  useEffect(load, []);

  async function createRule() {
    setSaving(true);
    try {
      await fetch('/api/admin/credit-rules', {
        method: 'POST',
        body: JSON.stringify({ ...form, creditsPerUnit: Number(form.creditsPerUnit) }),
      });
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="mb-2 text-cardh2">Nueva versión (desactiva la anterior de la misma acción)</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="creditRuleActionKind" className="text-body font-medium">
              Acción
            </label>
            <select
              id="creditRuleActionKind"
              value={form.actionKind}
              onChange={(e) => setForm({ ...form, actionKind: e.target.value })}
              className="rounded-md border border-border bg-card px-3 py-2 text-body"
            >
              <option value="excel">excel</option>
              <option value="chat">chat</option>
              <option value="insight">insight</option>
              <option value="report_generation">report_generation</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="creditRuleType" className="text-body font-medium">
              Tipo
            </label>
            <select
              id="creditRuleType"
              value={form.ruleType}
              onChange={(e) => setForm({ ...form, ruleType: e.target.value })}
              className="rounded-md border border-border bg-card px-3 py-2 text-body"
            >
              <option value="fixed">fixed</option>
              <option value="variable">variable</option>
            </select>
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
          {saving ? 'Guardando…' : 'Publicar nueva versión'}
        </Button>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Acción</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Créditos/unidad</TableHead>
              <TableHead>Versión</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules?.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-eyebrow uppercase text-faint">
                  {r.actionKind}
                </TableCell>
                <TableCell>{r.ruleType}</TableCell>
                <TableCell className="font-mono tabular-nums">
                  {r.creditsPerUnit} {r.unit ? `/ ${r.unit}` : ''}
                </TableCell>
                <TableCell className="font-mono tabular-nums">v{r.version}</TableCell>
                <TableCell>
                  <Badge variant={r.active ? 'success' : 'neutral'}>
                    {r.active ? 'activa' : 'histórica'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
