'use client';

import { Card } from '@/components/ui/card';
import { AdminLoadError } from '@/components/admin/admin-load-error';
import { request } from '@/lib/api/browser';
import { useResource } from '@/lib/api/use-resource';
import type { Dictionary } from '@/lib/i18n/dictionary';
import { formatMoney, formatNumber, formatPct } from '@/lib/format';
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
  totalCacheReadTokens: string;
  totalCacheCreationTokens: string;
  /**
   * Fracción de la ENTRADA servida desde el caché de prompt, ya calculada en el backend
   * (`lib/ai-usage.ts`). No se deriva acá a propósito: es una cifra que más de una pantalla
   * va a mostrar y que no puede diferir entre ellas.
   *
   * `null` = la empresa no tiene entrada registrada. Distinto de 0, que es "el caché no
   * pegó": pintar 0 % donde no hay datos es una alarma falsa.
   */
  cacheHitRate: number | null;
  callCount: string;
}

// CU-868kfvag7 criterio 3: costo real en USD/tokens SOLO aquí (staff/super_admin) —
// el cliente nunca ve esta pantalla ni estos números, solo su saldo en créditos.
export function AiCostPanel({
  labels,
  common,
}: {
  labels: Dictionary['admin']['aiCost'];
  common: Dictionary['admin']['common'];
}) {
  // CU-868kkgb3c: antes un 403 (o cualquier fallo) dejaba `rows` en `null` y el panel
  // renderizaba la nada — sin decir que hacía falta rol staff.
  const { state, reload } = useResource<CostRow[]>(() => request<CostRow[]>('/api/admin/ai-cost'));

  if (state.status === 'loading') return null;
  if (state.status === 'error')
    return <AdminLoadError error={state.error} labels={common.loadError} onRetry={reload} />;
  const rows = state.data;

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{labels.colCompany}</TableHead>
            <TableHead>{labels.colKind}</TableHead>
            <TableHead>{labels.colCost}</TableHead>
            <TableHead>{labels.colTokens}</TableHead>
            <TableHead>{labels.colCache}</TableHead>
            <TableHead>{labels.colCalls}</TableHead>
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
              <TableCell className="tabular-nums">
                {formatMoney(r.totalCostUsd, 'USD', 'es', { fractionDigits: 4 })}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatNumber(r.totalInputTokens)} / {formatNumber(r.totalOutputTokens)}
              </TableCell>
              {/* Sin color de estado: no hay un umbral acordado de "buena" tasa de caché,
                  y pintar de verde o rojo un número sin criterio inventa una alarma. Es un
                  dato para leer, no un semáforo — y el verde de marca nunca va sobre un
                  dato (regla de los dos verdes). */}
              <TableCell className="tabular-nums">
                {r.cacheHitRate === null ? (
                  <span className="text-faint">{labels.cacheNone}</span>
                ) : (
                  formatPct(r.cacheHitRate, 'es', 0)
                )}
              </TableCell>
              <TableCell className="tabular-nums">{formatNumber(r.callCount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
