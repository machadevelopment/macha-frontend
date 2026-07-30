'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
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

export function IndustryTemplatesPanel() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [versions, setVersions] = useState<Record<string, Version[]>>({});

  useEffect(() => {
    fetch('/api/admin/industry-templates')
      .then((r) => r.json())
      .then((data: Template[]) => {
        setTemplates(data);
        for (const t of data) {
          fetch(`/api/admin/industry-templates/${t.id}/versions`)
            .then((r) => r.json())
            .then((v: Version[]) => setVersions((prev) => ({ ...prev, [t.id]: v })));
        }
      });
  }, []);

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
                <TableHead>Versión</TableHead>
                <TableHead>Creada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions[t.id]?.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono tabular-nums">
                    v{v.version} {v.id === t.currentVersionId && '(actual)'}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums text-muted-foreground">
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
