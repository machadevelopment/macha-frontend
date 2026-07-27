'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

export function CompanyDetailPanel({ companyId }: { companyId: string }) {
  const [users, setUsers] = useState<CompanyUserRow[] | null>(null);
  const [alertRules, setAlertRules] = useState<AlertRuleRow[] | null>(null);

  function loadUsers() {
    fetch(`/api/admin/companies/${companyId}/users`)
      .then((r) => r.json())
      .then(setUsers);
  }
  function loadAlertRules() {
    fetch(`/api/admin/companies/${companyId}/alert-rules`)
      .then((r) => r.json())
      .then(setAlertRules);
  }

  useEffect(() => {
    loadUsers();
    loadAlertRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function updateRole(userId: string, role: string) {
    await fetch(`/api/admin/companies/${companyId}/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    loadUsers();
  }

  async function updateThreshold(ruleKey: string, threshold: number) {
    await fetch(`/api/admin/companies/${companyId}/alert-rules/${ruleKey}`, {
      method: 'PATCH',
      body: JSON.stringify({ threshold }),
    });
    loadAlertRules();
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="mb-2 text-cardh2">Usuarios</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((u) => (
              <TableRow key={u.userId}>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <select
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

      <Card>
        <p className="mb-2 text-cardh2">Umbrales de alerta</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Regla</TableHead>
              <TableHead>Umbral</TableHead>
              <TableHead>Notifica de inmediato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alertRules?.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-mono text-eyebrow uppercase text-faint">
                  {rule.ruleKey}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    defaultValue={rule.threshold}
                    className="w-24"
                    onBlur={(e) => updateThreshold(rule.ruleKey, Number(e.target.value))}
                  />
                </TableCell>
                <TableCell className="font-mono text-eyebrow uppercase text-faint">
                  {rule.notifyImmediately ? 'sí' : 'no'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
