import { TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPct } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/cn';

// design guide.md §5 "KPI card" (`.kpi`) — Tremor Raw was the spec, but F1 shipped
// @tremor/react instead (see CLAUDE.md "Known deviation"). Its own color system
// doesn't map onto our green/red/amber tokens, so this KPI card is built directly
// on our own Card/Badge primitives rather than Tremor's Metric/BadgeDelta — actual
// Recharts-backed charts (AreaChart/BarChart/DonutChart, F4) are where @tremor/react
// itself gets used.
export interface KpiCardProps {
  label: string;
  value: string;
  /** Fraction, not a percentage — e.g. 0.123 renders as "+12.3%" (formatPct). */
  delta?: number;
  /** For cost-type metrics where an increase is bad (e.g. cogs) — flips green/red. */
  invertDelta?: boolean;
  /**
   * CU-868kh8y58: segunda cifra del MISMO dato, no un dato distinto — el par
   * "utilidad bruta Q35,700 · margen bruto 35.7%". Mono y tabular como el valor
   * principal, porque es un número (design guide §"regla mono").
   */
  secondary?: string;
  /**
   * CU-868kh8y58: explicación en lenguaje de dueño, no contable ("De cada Q100 de
   * venta, esto te queda antes de gastos fijos"). Es prosa, así que va en `font-ui`
   * — la regla mono aplica a cifras y eyebrows, no a una frase.
   */
  hint?: string;
  locale?: Locale;
  loading?: boolean;
  className?: string;
}

export function KpiCard({
  label,
  value,
  delta,
  invertDelta = false,
  secondary,
  hint,
  locale = 'es',
  loading,
  className,
}: KpiCardProps) {
  if (loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <div className="h-[10.5px] w-20 rounded bg-muted" />
        <div className="mt-3 h-[29px] w-24 rounded bg-muted" />
      </Card>
    );
  }

  const isGood = invertDelta ? (delta ?? 0) <= 0 : (delta ?? 0) >= 0;

  return (
    <Card className={className}>
      <p className="font-mono text-eyebrow uppercase text-faint">{label}</p>
      <p className="mt-1 font-mono text-kpi tabular-nums">{value}</p>
      {secondary !== undefined && (
        <p className="mt-0.5 font-mono text-body tabular-nums text-muted-foreground">{secondary}</p>
      )}
      {hint !== undefined && <p className="mt-1 font-ui text-body text-faint">{hint}</p>}
      {delta !== undefined && (
        <Badge variant={isGood ? 'success' : 'danger'} className="mt-2 gap-1 normal-case">
          {delta >= 0 ? (
            <TrendingUp className="h-3 w-3" strokeWidth={2} />
          ) : (
            <TrendingDown className="h-3 w-3" strokeWidth={2} />
          )}
          {formatPct(Math.abs(delta), locale)}
        </Badge>
      )}
    </Card>
  );
}
