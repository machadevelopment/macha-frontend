'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface CostRow {
  companyId: string;
  companyName: string;
  kind: string;
  totalCostUsd: string;
  totalInputTokens: string;
  totalOutputTokens: string;
  callCount: string;
}

// CU-868kfvag7 criterio 3: costo real en USD/tokens SOLO aquí (staff/super_admin) —
// el cliente nunca ve esta pantalla ni estos números, solo su saldo en créditos.
export function AiCostPanel() {
  const [rows, setRows] = useState<CostRow[] | null>(null);

  useEffect(() => {
    fetch('/api/admin/ai-cost')
      .then((r) => r.json())
      .then(setRows);
  }, []);

  if (!rows) return null;

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Costo USD</TableHead>
            <TableHead>Tokens in/out</TableHead>
            <TableHead>Llamadas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{r.companyName}</TableCell>
              <TableCell className="font-mono text-eyebrow uppercase text-faint">
                {r.kind}
              </TableCell>
              <TableCell className="font-mono tabular-nums">
                ${Number(r.totalCostUsd).toFixed(4)}
              </TableCell>
              <TableCell className="font-mono tabular-nums">
                {r.totalInputTokens} / {r.totalOutputTokens}
              </TableCell>
              <TableCell className="font-mono tabular-nums">{r.callCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
