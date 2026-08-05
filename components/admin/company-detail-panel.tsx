'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import type { Dictionary } from '@/lib/i18n/dictionary';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AdminLoadError } from '@/components/admin/admin-load-error';
import { CompanyCreditsCard } from '@/components/admin/company-credits-card';
import { request, requestJson, type RequestError } from '@/lib/api/browser';
import { RULE_UNIT, RULE_UNIT_LABEL_ES, isKnownRule } from '@/lib/alerts/rule-units';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * CU-868khvzqn criterio 2: esta pantalla titulaba "EMPRESA / Detalle" y nada más. Desde
 * acá se cambian roles y umbrales de alerta de un tenant; con cinco empresas en la lista,
 * entrabas al detalle sin saber en cuál estabas.
 */
interface CompanySummary {
  id: string;
  name: string;
  industry: string;
  baseCurrency: string;
  status: 'active' | 'suspended';
  locale: 'es' | 'en';
}

interface CompanyUserRow {
  userId: string;
  email: string;
  name: string | null;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'invited' | 'revoked';
  receivesReports: boolean;
}

interface AlertRuleRow {
  id: string;
  ruleKey: string;
  threshold: string;
  enabled: boolean;
  notifyImmediately: boolean;
}

export function CompanyDetailPanel({
  companyId,
  labels,
  creditsLabels,
  common,
}: {
  companyId: string;
  labels: Dictionary['admin']['companyDetail'];
  /** Se recibe y se reenvía: la tarjeta de créditos es hija de esta pantalla. */
  creditsLabels: Dictionary['admin']['credits'];
  common: Dictionary['admin']['common'];
}) {
  const [company, setCompany] = useState<CompanySummary | null>(null);
  const [users, setUsers] = useState<CompanyUserRow[] | null>(null);
  const [alertRules, setAlertRules] = useState<AlertRuleRow[] | null>(null);

  const [loadError, setLoadError] = useState<RequestError | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // CU-868kkgb3c: las tres cargas iban sin manejo de fallo. La de empresa además
  // interpretaba `{error}` como "no existe" y dejaba `company` en `null`, así que un 500
  // se mostraba igual que una empresa inexistente.
  function loadCompany() {
    void request<CompanySummary>(`/api/admin/companies/${companyId}`).then((result) => {
      if (result.ok) setCompany(result.data);
      else setLoadError(result.error);
    });
  }
  function loadUsers() {
    void request<CompanyUserRow[]>(`/api/admin/companies/${companyId}/users`).then((result) => {
      if (result.ok) setUsers(result.data);
      else setLoadError(result.error);
    });
  }
  function loadAlertRules() {
    void request<AlertRuleRow[]>(`/api/admin/companies/${companyId}/alert-rules`).then((result) => {
      if (result.ok) setAlertRules(result.data);
      else setLoadError(result.error);
    });
  }

  useEffect(() => {
    loadCompany();
    loadUsers();
    loadAlertRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  // Cambiar el rol de alguien decide qué puede hacer con la contabilidad de su empresa;
  // un umbral decide cuándo se le avisa de un problema de liquidez. Que cualquiera de
  // los dos fallara en silencio dejaba al staff creyendo que había aplicado un cambio
  // que no existe.
  async function updateRole(userId: string, role: string) {
    setActionError(null);
    const result = await requestJson(`/api/admin/companies/${companyId}/users/${userId}`, 'PATCH', {
      role,
    });
    if (!result.ok) {
      setActionError(labels.roleError);
      return;
    }
    loadUsers();
  }

  async function updateThreshold(ruleKey: string, threshold: number) {
    setActionError(null);
    const result = await requestJson(
      `/api/admin/companies/${companyId}/alert-rules/${ruleKey}`,
      'PATCH',
      { threshold },
    );
    if (!result.ok) {
      setActionError(labels.thresholdError);
      return;
    }
    loadAlertRules();
  }

  if (loadError)
    return (
      <AdminLoadError
        error={loadError}
        labels={common.loadError}
        onRetry={() => location.reload()}
      />
    );

  return (
    <div className="flex flex-col gap-4">
      {actionError && <p className="text-body text-danger">{actionError}</p>}
      {/* CU-868khvzqn criterio 2: el nombre es el título de la pantalla, no un dato más.
          Industria, moneda base y estado van al lado porque cambian cómo se leen los
          umbrales y los montos de abajo. `locale` se muestra porque decide el idioma de
          los emails que recibe esa empresa, y no se ve en ninguna otra pantalla. */}
      <div>
        <p className="font-mono text-eyebrow uppercase text-faint">{labels.eyebrow}</p>
        <h1 className="text-h1">{company?.name ?? '—'}</h1>
        {company && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={company.status === 'active' ? 'success' : 'danger'}>
              {company.status}
            </Badge>
            <span className="font-mono text-eyebrow uppercase text-faint">{company.industry}</span>
            <span className="font-mono text-eyebrow uppercase text-faint">
              MONEDA BASE {company.baseCurrency}
            </span>
            <span className="font-mono text-eyebrow uppercase text-faint">
              IDIOMA {company.locale.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <Card>
        <p className="mb-2 text-cardh2">{labels.usersTitle}</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labels.colEmail}</TableHead>
              <TableHead>{labels.colRole}</TableHead>
              <TableHead>{labels.colStatus}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((u) => (
              <TableRow key={u.userId}>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <select
                    aria-label={`Rol de ${u.email}`}
                    value={u.role}
                    onChange={(e) => updateRole(u.userId, e.target.value)}
                    className="rounded-md border border-border bg-card px-2 py-1 text-body"
                  >
                    <option value="owner">owner</option>
                    <option value="admin">admin</option>
                    <option value="member">member</option>
                  </select>
                </TableCell>
                <TableCell className="font-mono text-eyebrow uppercase text-faint">
                  {u.status}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* CU-868kjc7g5: los créditos son por empresa y esta es la pantalla donde el staff
          toca lo que es por empresa. Carga su propio dato y maneja su propio fallo, así
          que un 403 de super_admin en el abono no tumba el resto del detalle. */}
      <CompanyCreditsCard companyId={companyId} labels={creditsLabels} common={common} />

      <Card>
        <p className="mb-2 text-cardh2">{labels.alertRulesTitle}</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labels.colRule}</TableHead>
              <TableHead>{labels.colThreshold}</TableHead>
              <TableHead>{labels.colNotifyNow}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alertRules?.map((rule) => {
              // CU-868khvzqn criterio 3: `ar_overdue: 30` (días) y
              // `portfolio_concentration: 35` (por ciento) se veían idénticos. El campo es
              // editable, así que la ambigüedad no era solo de lectura: un operador podía
              // meter un porcentaje donde van días. La unidad sale de `lib/alerts/rule-units`,
              // la misma fuente que usan el detalle y el histórico de alertas del cliente.
              const unit = isKnownRule(rule.ruleKey)
                ? RULE_UNIT_LABEL_ES[RULE_UNIT[rule.ruleKey]]
                : null;
              return (
                <TableRow key={rule.id}>
                  <TableCell className="font-mono text-eyebrow uppercase text-faint">
                    {rule.ruleKey}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        aria-label={
                          unit
                            ? `Umbral de ${rule.ruleKey} en ${unit}`
                            : `Umbral de ${rule.ruleKey}`
                        }
                        defaultValue={rule.threshold}
                        className="w-24"
                        onBlur={(e) => updateThreshold(rule.ruleKey, Number(e.target.value))}
                      />
                      {/* Una regla que exista en el catálogo del backend pero todavía no
                          acá se degrada a no mostrar unidad, nunca a romper la fila. */}
                      <span className="font-mono text-eyebrow text-faint">{unit ?? ''}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-eyebrow uppercase text-faint">
                    {rule.notifyImmediately ? 'sí' : 'no'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
