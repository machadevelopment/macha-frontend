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

interface CompanyRow {
  id: string;
  name: string;
  industry: string;
  baseCurrency: string;
  status: 'active' | 'suspended';
  createdAt: string;
}

export function CompaniesPanel() {
  const [companies, setCompanies] = useState<CompanyRow[] | null>(null);
  const [form, setForm] = useState({
    workosOrgId: '',
    name: '',
    industry: '',
    baseCurrency: 'GTQ',
    locale: 'es',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch('/api/admin/companies')
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setCompanies)
      .catch(() => setError('No autorizado — se necesita rol staff/super_admin.'));
  }

  useEffect(load, []);

  async function createCompany() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/companies', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        setError('No se pudo crear la empresa.');
        return;
      }
      setForm({ workosOrgId: '', name: '', industry: '', baseCurrency: 'GTQ', locale: 'es' });
      load();
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(company: CompanyRow) {
    const nextStatus = company.status === 'active' ? 'suspended' : 'active';
    await fetch(`/api/admin/companies/${company.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    });
    load();
  }

  if (error) return <p className="text-body text-danger">{error}</p>;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="mb-2 text-cardh2">Alta manual de empresa</p>
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="workosOrgId"
            label="WorkOS Org ID"
            value={form.workosOrgId}
            onChange={(e) => setForm({ ...form, workosOrgId: e.target.value })}
          />
          <Field
            id="name"
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Field
            id="industry"
            label="Industria"
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
          />
          <Field
            id="baseCurrency"
            label="Moneda base (GTQ/USD)"
            value={form.baseCurrency}
            onChange={(e) => setForm({ ...form, baseCurrency: e.target.value })}
          />
        </div>
        <Button size="sm" className="mt-3" onClick={createCompany} disabled={creating}>
          {creating ? 'Creando…' : 'Crear empresa (aprovisiona partición)'}
        </Button>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Industria</TableHead>
              <TableHead>Moneda</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies?.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <a href={`/admin/companies/${c.id}`} className="text-body underline">
                    {c.name}
                  </a>
                </TableCell>
                <TableCell className="font-mono text-eyebrow uppercase text-faint">
                  {c.industry}
                </TableCell>
                <TableCell className="font-mono tabular-nums">{c.baseCurrency}</TableCell>
                <TableCell>
                  <Badge variant={c.status === 'active' ? 'success' : 'danger'}>{c.status}</Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => toggleStatus(c)}>
                    {c.status === 'active' ? 'Suspender' : 'Activar'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
