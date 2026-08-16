'use client';

import { Fragment, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { AdminLoadError } from '@/components/admin/admin-load-error';
import { request } from '@/lib/api/browser';
import { useResource } from '@/lib/api/use-resource';
import { cn } from '@/lib/cn';
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

export interface CostRow {
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

export interface Empresa {
  companyId: string;
  companyName: string;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  callCount: number;
  /** Las filas originales del backend, una por `kind`, ya ordenadas por costo. */
  detalle: CostRow[];
}

/**
 * ═══ POR QUÉ EL TOTAL DE LA EMPRESA SE SUMA ACÁ Y NO SE PIDE AL BACKEND ═══
 *
 * CU-868krkatv. `GET /admin/ai-cost` ya devuelve el grano fino —una fila por (empresa, tipo
 * de acción)— que es justo el desglose que Macha pide ver al expandir. El total por empresa
 * es la suma de esas mismas filas, así que pedirlo aparte sería una segunda consulta cuyo
 * único riesgo es que los dos números dejen de cuadrar. Se agrega en memoria: son decenas
 * de filas, no miles.
 *
 * LA TASA DE CACHÉ DE LA EMPRESA SE RECALCULA, NO SE PROMEDIA. Promediar los `cacheHitRate`
 * de cada tipo daría el promedio de las TASAS, que no es la tasa del conjunto: un `chat` con
 * 100 tokens al 90 % y un `excel` con 1.000.000 al 10 % darían "50 %" cuando la realidad
 * está pegada al 10 %. Se rehace la división sobre los totales, que es la misma definición
 * que usa `lib/ai-usage.ts` en el backend: lectura de caché sobre entrada total.
 *
 * El `null` se conserva con su significado: si la empresa no registró entrada alguna, la
 * celda dice "sin datos" en vez de un 0 % que se leería como "el caché nunca pegó".
 */
export function agrupar(rows: CostRow[]): Empresa[] {
  const porEmpresa = new Map<string, Empresa>();

  for (const r of rows) {
    const acc = porEmpresa.get(r.companyId) ?? {
      companyId: r.companyId,
      companyName: r.companyName,
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      callCount: 0,
      detalle: [],
    };

    acc.costUsd += Number(r.totalCostUsd);
    acc.inputTokens += Number(r.totalInputTokens);
    acc.outputTokens += Number(r.totalOutputTokens);
    acc.cacheReadTokens += Number(r.totalCacheReadTokens);
    acc.callCount += Number(r.callCount);
    acc.detalle.push(r);

    porEmpresa.set(r.companyId, acc);
  }

  // "Ordenado" del ticket = por lo que se está gastando, de más a menos. Es la pregunta que
  // se le hace a esta pantalla: quién consume. Alfabético obligaría a leerla entera.
  const empresas = [...porEmpresa.values()].sort((a, b) => b.costUsd - a.costUsd);
  for (const e of empresas) {
    e.detalle.sort((a, b) => Number(b.totalCostUsd) - Number(a.totalCostUsd));
  }
  return empresas;
}

export function tasaCache(e: Empresa): number | null {
  return e.inputTokens + e.cacheReadTokens === 0
    ? null
    : e.cacheReadTokens / (e.inputTokens + e.cacheReadTokens);
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
  const [abiertas, setAbiertas] = useState<ReadonlySet<string>>(() => new Set());

  const data = state.status === 'ready' ? state.data : null;
  // `useMemo` con `data` y no con `state`: el objeto de estado es nuevo en cada render del
  // hook, así que memoizar contra él no memoizaría nada.
  const empresas = useMemo(() => (data ? agrupar(data) : []), [data]);

  if (state.status === 'loading') return null;
  if (state.status === 'error')
    return <AdminLoadError error={state.error} labels={common.loadError} onRetry={reload} />;

  function alternar(companyId: string) {
    setAbiertas((prev) => {
      const next = new Set(prev);
      if (!next.delete(companyId)) next.add(companyId);
      return next;
    });
  }

  return (
    <Card>
      {/*
        CU-868krkatv — MAESTRO-DETALLE, NO TABLA PLANA.

        La tabla anterior tenía una fila por (empresa, tipo de acción), así que el nombre de
        la empresa se repetía tantas veces como tipos hubiera y no existía en ningún lado el
        número que Macha quería primero: cuánto gasta CADA empresa. Había que sumarlo con la
        vista. Ahora la fila es la empresa con su total, y el desglose por tipo —"Excel: $2,
        Chat: $1, Reporte: $0.5"— aparece al expandirla.

        Se mantiene UNA sola `<table>` y el detalle entra como filas hermanas, no como una
        tabla anidada: anidar rompe la alineación de columnas entre maestro y detalle, que es
        justo lo que hace comparable el desglose contra el total de arriba.
      */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{labels.colCompany}</TableHead>
            <TableHead>{labels.colCost}</TableHead>
            <TableHead>{labels.colTokens}</TableHead>
            <TableHead>{labels.colCache}</TableHead>
            <TableHead>{labels.colCalls}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empresas.map((e) => {
            const abierta = abiertas.has(e.companyId);
            const tasa = tasaCache(e);
            return (
              <Fragment key={e.companyId}>
                <TableRow>
                  <TableCell>
                    {/*
                      El disparador es un `<button>` de verdad y no un `onClick` sobre la
                      fila: la fila no es enfocable ni la anuncia un lector de pantalla, y
                      `aria-expanded` necesita colgar de algo que sea un control.
                    */}
                    <button
                      type="button"
                      onClick={() => alternar(e.companyId)}
                      aria-expanded={abierta}
                      className="flex items-center gap-1.5 text-left hover:text-foreground"
                    >
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 shrink-0 text-faint transition-transform',
                          abierta && 'rotate-90',
                        )}
                        strokeWidth={1.7}
                      />
                      <span>{e.companyName}</span>
                    </button>
                  </TableCell>
                  {/* Código de moneda explícito (CLAUDE.md): el producto opera en GTQ y USD,
                      `$` es ambiguo. Los 4 decimales sí se conservan: el costo por llamada
                      está en el orden de USD 0.0004 y con 2 decimales se vería como cero. */}
                  <TableCell className="tabular-nums">
                    {formatMoney(e.costUsd, 'USD', 'es', { fractionDigits: 4 })}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatNumber(e.inputTokens)} / {formatNumber(e.outputTokens)}
                  </TableCell>
                  {/* Sin color de estado: no hay un umbral acordado de "buena" tasa de caché,
                      y pintar de verde o rojo un número sin criterio inventa una alarma. Es un
                      dato para leer, no un semáforo — y el verde de marca nunca va sobre un
                      dato (regla de los dos verdes). */}
                  <TableCell className="tabular-nums">
                    {tasa === null ? (
                      <span className="text-faint">{labels.cacheNone}</span>
                    ) : (
                      formatPct(tasa, 'es', 0)
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{formatNumber(e.callCount)}</TableCell>
                </TableRow>

                {abierta &&
                  e.detalle.map((d) => (
                    // `bg-muted` a secas, sin modificador de opacidad: el token es
                    // `var(--fill)` y Tailwind solo sabe aplicarle un alfa si el valor trae
                    // el placeholder `<alpha-value>`, que estos no traen. `bg-muted/40`
                    // compilaría a una clase que el navegador descarta y la fila de detalle
                    // se vería idéntica a la de la empresa.
                    <TableRow key={`${e.companyId}:${d.kind}`} className="bg-muted">
                      {/* El tipo ocupa la celda de la columna "Empresa", que es lo que lo
                          alinea bajo su empresa. Para un lector de pantalla eso se anuncia
                          como si "excel" fuera un nombre de empresa, así que el encabezado
                          real de ese dato va delante en `sr-only`. */}
                      <TableCell className="pl-9 font-mono text-eyebrow uppercase text-faint">
                        <span className="sr-only">{labels.colKind}: </span>
                        {d.kind}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatMoney(d.totalCostUsd, 'USD', 'es', { fractionDigits: 4 })}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatNumber(d.totalInputTokens)} / {formatNumber(d.totalOutputTokens)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {d.cacheHitRate === null ? (
                          <span className="text-faint">{labels.cacheNone}</span>
                        ) : (
                          formatPct(d.cacheHitRate, 'es', 0)
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">{formatNumber(d.callCount)}</TableCell>
                    </TableRow>
                  ))}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
