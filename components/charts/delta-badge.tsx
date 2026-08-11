import { TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatPct } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n/config';

/**
 * El chip de variación (↑/↓ + porcentaje) que vivía dentro de `KpiCard`.
 *
 * Sale de ahí porque la tendencia de Analítica (CU-868knx15v) muestra el MISMO delta pero
 * junto a una cifra grande sobre la gráfica, no dentro de una tarjeta de KPI. Con el chip
 * encerrado en `KpiCard`, la única salida era volver a escribir la regla de signo — y esa
 * regla no es obvia: en un gasto que sube, la flecha apunta hacia arriba pero el color es
 * ROJO. Dos implementaciones de eso se desincronizan y el producto termina pintando de
 * verde un gasto que creció.
 *
 * Es el verde/rojo FUNCIONAL (design guide §2.6): dice "este dato va bien o mal". El salvia
 * de marca nunca aparece acá.
 */
export function DeltaBadge({
  value,
  invert = false,
  locale = 'es',
  className,
}: {
  /** Fracción, no porcentaje: 0.123 se pinta como "12.3%". */
  value: number;
  /** Para métricas de costo, donde subir es malo: invierte verde/rojo, no la flecha. */
  invert?: boolean;
  locale?: Locale;
  className?: string;
}) {
  // La FLECHA sigue la dirección real del número y el COLOR sigue si eso es bueno o malo.
  // Son dos cosas distintas: un gasto que baja es flecha abajo y chip verde.
  const bueno = invert ? value <= 0 : value >= 0;

  return (
    <Badge variant={bueno ? 'success' : 'danger'} className={cn('gap-1 normal-case', className)}>
      {value >= 0 ? (
        <TrendingUp className="h-3 w-3" strokeWidth={2} />
      ) : (
        <TrendingDown className="h-3 w-3" strokeWidth={2} />
      )}
      {formatPct(Math.abs(value), locale)}
    </Badge>
  );
}
