'use client';

import { useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import type { Dictionary } from '@/lib/i18n/dictionary';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { AdminLoadError } from '@/components/admin/admin-load-error';
import { request, requestJson } from '@/lib/api/browser';
import { usePagedList } from '@/lib/api/use-paged-list';
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

const PAGE_SIZE = 50;

export function CompaniesPanel({
  labels,
  common,
}: {
  labels: Dictionary['admin']['companies'];
  common: Dictionary['admin']['common'];
}) {
  const [form, setForm] = useState({
    workosOrgId: '',
    name: '',
    industry: '',
    baseCurrency: 'GTQ',
    locale: 'es',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CU-868kh913c: mismo patrón "load more" que los otros paneles de admin.
  // CU-868kkgb3c: este panel era el ÚNICO con un `.catch`, pero atribuía cualquier
  // fallo a "no autorizado" — un 500 o un corte de red se reportaban como falta de
  // permisos. Ahora el motivo real lo clasifica `request`.
  const { state, loadMore, loadingMore, moreError, reload } = usePagedList<CompanyRow>(
    useCallback(async (offset) => {
      const result = await request<{ companies: CompanyRow[]; hasMore: boolean }>(
        `/api/admin/companies?limit=${PAGE_SIZE}&offset=${offset}`,
      );
      return result.ok
        ? {
            ok: true as const,
            data: { items: result.data.companies, hasMore: result.data.hasMore },
          }
        : result;
    }, []),
  );

  async function createCompany() {
    setCreating(true);
    setError(null);
    try {
      const result = await requestJson('/api/admin/companies', 'POST', form);
      if (!result.ok) {
        setError(labels.createError);
        return;
      }
      setForm({ workosOrgId: '', name: '', industry: '', baseCurrency: 'GTQ', locale: 'es' });
      reload();
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(company: CompanyRow) {
    const nextStatus = company.status === 'active' ? 'suspended' : 'active';
    const result = await requestJson(`/api/admin/companies/${company.id}/status`, 'PATCH', {
      status: nextStatus,
    });
    // CU-868kkgb3c: suspender una empresa le corta el acceso a su contabilidad. Que
    // fallara en silencio dejaba al staff creyendo que la había suspendido.
    if (!result.ok) {
      setError(labels.statusError);
      return;
    }
    reload();
  }

  if (state.status === 'loading') return null;
  if (state.status === 'error')
    return <AdminLoadError error={state.error} labels={common.loadError} onRetry={reload} />;
  const companies = state.items;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="mb-2 text-cardh2">{labels.createTitle}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          {creating ? labels.creating : labels.createAction}
        </Button>
        {/* CU-868kkgb3c: el error de alta/estado ya no reemplaza el panel entero — antes
            un `return` temprano borraba la tabla y el formulario. */}
        {error && <p className="mt-2 text-body text-danger">{error}</p>}
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labels.colCompany}</TableHead>
              <TableHead>{labels.colIndustry}</TableHead>
              <TableHead>{labels.colCurrency}</TableHead>
              <TableHead>{labels.colStatus}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((c) => (
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
                    {c.status === 'active' ? labels.suspend : labels.activate}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {moreError && (
          <AdminLoadError error={moreError} labels={common.loadError} onRetry={loadMore} />
        )}
        {state.hasMore && !moreError && (
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? common.loading : common.loadMore}
          </Button>
        )}
      </Card>
    </div>
  );
}
