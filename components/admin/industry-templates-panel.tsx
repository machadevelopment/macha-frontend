'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import type { Dictionary } from '@/lib/i18n/dictionary';
import { AdminLoadError } from '@/components/admin/admin-load-error';
import { request, type RequestError } from '@/lib/api/browser';
import { formatDate } from '@/lib/format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Template {
  id: string;
  industry: string;
  name: string;
  currentVersionId: string | null;
}

interface Version {
  id: string;
  version: number;
  createdAt: string;
}

export function IndustryTemplatesPanel({
  labels,
  common,
}: {
  labels: Dictionary['admin']['industryTemplates'];
  common: Dictionary['admin']['common'];
}) {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [versions, setVersions] = useState<Record<string, Version[]>>({});

  const [loadError, setLoadError] = useState<RequestError | null>(null);

  // CU-868kkgb3c: dos niveles de fetch anidados y ninguno protegido. Si fallaba el de
  // versiones, la plantilla quedaba con la tabla vacía — indistinguible de una plantilla
  // recién creada y sin versiones.
  useEffect(() => {
    void request<Template[]>('/api/admin/industry-templates').then((result) => {
      if (!result.ok) {
        setLoadError(result.error);
        return;
      }
      setTemplates(result.data);
      for (const t of result.data) {
        void request<Version[]>(`/api/admin/industry-templates/${t.id}/versions`).then((v) => {
          // El fallo de UNA plantilla no tumba el panel: se deja su tabla sin filas y el
          // resto sigue. Reintentar recarga la pantalla completa.
          if (v.ok) setVersions((prev) => ({ ...prev, [t.id]: v.data }));
        });
      }
    });
  }, []);

  if (loadError)
    return (
      <AdminLoadError
        error={loadError}
        labels={common.loadError}
        onRetry={() => location.reload()}
      />
    );
  if (!templates) return null;

  return (
    <div className="flex flex-col gap-3">
      {templates.map((t) => (
        <Card key={t.id}>
          <p className="text-cardh2">
            {t.name}{' '}
            <span className="font-mono text-eyebrow uppercase text-faint">({t.industry})</span>
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.colVersion}</TableHead>
                <TableHead>{labels.colCreated}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions[t.id]?.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="tabular-nums">
                    v{v.version} {v.id === t.currentVersionId && '(actual)'}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatDate(v.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ))}
    </div>
  );
}
