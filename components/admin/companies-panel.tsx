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
import { formatMoney, formatNumber } from '@/lib/format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * Ticket B5 — la fila trae, además de la identidad de la empresa, su plan, su saldo de
 * créditos y su consumo de IA acumulado. Todo viene de UNA sola respuesta
 * (`/api/admin/companies/overview`): con el listado a secas, el saldo era una petición
 * POR EMPRESA y el costo otra pantalla distinta.
 */
interface CompanyRow {
  id: string;
  name: string;
  industry: string;
  baseCurrency: string;
  status: 'active' | 'suspended';
  createdAt: string;
  /**
   * `planName` es el nombre del catálogo `plans`; `planCode` es lo que hay escrito en la
   * suscripción. Se prefiere el nombre y se cae al código porque un plan retirado del
   * catálogo deja suscripciones vivas apuntándolo, y en ese caso el código sigue siendo
   * más informativo que un guion. Ambos son `null` en una empresa sin suscripción.
   */
  planCode: string | null;
  planName: string | null;
  creditBalance: number;
  /** Mismos nombres que `/admin/ai-cost` — las dos tablas se formatean con el mismo código. */
  totalCostUsd: string;
  totalInputTokens: string;
  totalOutputTokens: string;
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
  // Ticket B5: la fuente pasa a ser `/overview`, que devuelve el mismo listado paginado
  // ya cruzado con plan, saldo y consumo de IA. El contrato de paginación es idéntico,
  // así que el "cargar más" no cambia.
  const { state, loadMore, loadingMore, moreError, reload } = usePagedList<CompanyRow>(
    useCallback(async (offset) => {
      const result = await request<{ companies: CompanyRow[]; hasMore: boolean }>(
        `/api/admin/companies/overview?limit=${PAGE_SIZE}&offset=${offset}`,
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
              <TableHead>{labels.colPlan}</TableHead>
              <TableHead>{labels.colBalance}</TableHead>
              <TableHead>{labels.colAiCost}</TableHead>
              <TableHead>{labels.colTokens}</TableHead>
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
                <TableCell className="tabular-nums">{c.baseCurrency}</TableCell>
                {/* El plan es texto de catálogo, no un dato de "va bien o mal": sin color.
                    Cuando no hay suscripción se dice con palabras, no con un guion. */}
                <TableCell className="text-body">
                  {c.planName ?? c.planCode ?? <span className="text-faint">{labels.noPlan}</span>}
                </TableCell>
                {/* Saldo agotado = la empresa no puede pedir un insight. Eso SÍ es un
                    estado, así que va con color funcional y —regla del design guide §2.6—
                    como chip completo (texto+fondo+borde), nunca texto de color suelto. */}
                <TableCell className="tabular-nums">
                  {c.creditBalance <= 0 ? (
                    <Badge variant="danger">{formatNumber(c.creditBalance)}</Badge>
                  ) : (
                    formatNumber(c.creditBalance)
                  )}
                </TableCell>
                {/* Código de moneda explícito y 4 decimales, igual que `/admin/ai-cost`:
                    el costo por llamada está en el orden de USD 0.0004 y con 2 decimales
                    una empresa con consumo real se vería como cero. */}
                <TableCell className="tabular-nums">
                  {formatMoney(c.totalCostUsd, 'USD', 'es', { fractionDigits: 4 })}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatNumber(c.totalInputTokens)} / {formatNumber(c.totalOutputTokens)}
                </TableCell>
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
        {/* El drill-down NO se va: esta tabla da el total de IA por empresa y la
            descomposición por tipo de acción sigue en `/admin/ai-cost`. */}
        <a
          href="/admin/ai-cost"
          className="mt-3 inline-block text-body text-muted-foreground underline"
        >
          {labels.aiCostBreakdown}
        </a>
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
