'use client';

import { Card } from '@/components/ui/card';
import { AdminLoadError } from '@/components/admin/admin-load-error';
import { request } from '@/lib/api/browser';
import { useResource } from '@/lib/api/use-resource';
import { formatMoney, formatNumber } from '@/lib/format';
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
  // CU-868kkgb3c: antes un 403 (o cualquier fallo) dejaba `rows` en `null` y el panel
  // renderizaba la nada — sin decir que hacía falta rol staff.
  const { state, reload } = useResource<CostRow[]>(() => request<CostRow[]>('/api/admin/ai-cost'));

  if (state.status === 'loading') return null;
  if (state.status === 'error') return <AdminLoadError error={state.error} onRetry={reload} />;
  const rows = state.data;

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Costo</TableHead>
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
              {/* Código de moneda explícito (CLAUDE.md): el producto opera en GTQ y USD,
                  `$` es ambiguo. Los 4 decimales sí se conservan: el costo por llamada
                  está en el orden de USD 0.0004 y con 2 decimales se vería como cero. */}
              <TableCell className="font-mono tabular-nums">
                {formatMoney(r.totalCostUsd, 'USD', 'es', { fractionDigits: 4 })}
              </TableCell>
              <TableCell className="font-mono tabular-nums">
                {formatNumber(r.totalInputTokens)} / {formatNumber(r.totalOutputTokens)}
              </TableCell>
              <TableCell className="font-mono tabular-nums">{formatNumber(r.callCount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
