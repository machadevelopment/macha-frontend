import { TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPct } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/cn';
import { Sparkline } from '@/components/charts/sparkline';

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
  /**
   * Cifra exacta bajo el valor abreviado, siguiendo el prototipo: arriba "Q1.29M" para
   * leer de un vistazo, debajo "Q 1,290,000" para el número real. En un producto
   * financiero abreviar y NO ofrecer el exacto obliga a salir de la pantalla a
   * verificar; mostrarlo cuesta una línea.
   */
  exact?: string;
  /** Ícono a la derecha de la etiqueta, como en el prototipo. */
  icon?: React.ReactNode;
  /** Texto bajo el delta: "vs mes anterior". Sin esto un porcentaje no dice contra qué. */
  deltaCaption?: string;
  /**
   * Serie para el sparkline del prototipo "MVP Macha". Son los MISMOS valores mensuales
   * que ya devuelve `/api/metrics`, no un adorno: si no hay serie, no se dibuja nada en
   * vez de inventar una.
   */
  spark?: number[];
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
  exact,
  icon,
  deltaCaption,
  spark,
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
    // La elevación al pasar el cursor viene del prototipo. Con transform+transition de
    // CSS y no con framer-motion: es una dependencia entera para un desplazamiento de
    // 2px, y CLAUDE.md pide verificar compatibilidad con Bun antes de sumar librerías.
    <Card
      className={cn('transition-transform duration-200 ease-out hover:-translate-y-0.5', className)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-eyebrow uppercase text-faint">{label}</p>
        {icon && <span className="shrink-0 text-faint">{icon}</span>}
      </div>
      {/*
        El valor manda y el sparkline va DEBAJO, no al lado.
        Antes eran hermanos en un flex con el sparkline en `shrink-0`, y con datos reales eso
        se rompía: de ~148px útiles el sparkline se llevaba 96 (80 + gap) y al número le
        quedaban 52 para escribir `GTQ 480,663.00`. No se recortaba — se DESBORDABA y se
        pintaba sobre la tarjeta vecina. Debajo, el número tiene todo el ancho y el sparkline
        se estira al que sobre (ver `Sparkline`, que ahora usa viewBox).

        `min-w-0` + `truncate` es el tope duro: aunque el número creciera hasta no caber, se
        recorta DENTRO de su tarjeta. Que un dato financiero se corte es malo; que se pinte
        encima del de al lado y los dos queden ilegibles es peor, y la cifra completa está una
        línea más abajo en `exact`.
      */}
      <p className="mt-1 min-w-0 truncate font-mono text-kpi tabular-nums">{value}</p>
      {exact !== undefined && (
        <p className="mt-1 font-mono text-body tabular-nums text-muted-foreground">{exact}</p>
      )}
      {secondary !== undefined && (
        <p className="mt-0.5 font-mono text-body tabular-nums text-muted-foreground">{secondary}</p>
      )}
      {spark && <Sparkline data={spark} height={28} className="mt-2 w-full text-foreground" />}
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
      {delta !== undefined && deltaCaption && (
        <p className="mt-1 font-ui text-body text-faint">{deltaCaption}</p>
      )}
    </Card>
  );
}
