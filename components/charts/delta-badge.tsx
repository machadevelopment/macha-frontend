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
 *
 * ═══ DOS PRESENTACIONES, Y LA REGLA DE COLOR SE CUMPLE EN LAS DOS (CU-868ktknbq) ═══
 *
 * `chip` (por defecto) es lo de siempre: texto + fondo + borde juntos.
 *
 * `inline` es texto de color con la flecha al lado, sin caja, como en el prototipo. Se agregó
 * para la fila de KPIs, donde el chip se llevaba una fila entera de cada tarjeta y era parte de
 * por qué el panel medía casi el doble de alto que el prototipo.
 *
 * Y NO rompe la regla de "el color de estado nunca aparece solo" (CU-868knx0vh, aprobada por
 * Jose). Esa regla existe para que el estado no dependa ÚNICAMENTE del color —quien no
 * distingue verde de rojo tiene que poder leerlo igual— y el canal redundante acá es la
 * FLECHA: ↗ y ↘ dicen la dirección sin usar color. Lo que la regla prohíbe es color a secas;
 * el fondo y el borde eran UNA forma de cumplirla, no la única. Por eso el chip sigue siendo el
 * default y sigue siendo obligatorio donde el único canal disponible es el color — un rótulo de
 * estado sin flecha (`key-alerts-card`) no puede usar `inline`.
 */
export function DeltaBadge({
  value,
  invert = false,
  locale = 'es',
  presentation = 'chip',
  className,
}: {
  /** Fracción, no porcentaje: 0.123 se pinta como "12.3%". */
  value: number;
  /** Para métricas de costo, donde subir es malo: invierte verde/rojo, no la flecha. */
  invert?: boolean;
  locale?: Locale;
  /**
   * `chip` = texto+fondo+borde (default, y lo único válido donde no hay flecha).
   * `inline` = texto de color con la flecha, sin caja. Ver la nota de arriba.
   */
  presentation?: 'chip' | 'inline';
  className?: string;
}) {
  // La FLECHA sigue la dirección real del número y el COLOR sigue si eso es bueno o malo.
  // Son dos cosas distintas: un gasto que baja es flecha abajo y chip verde.
  const bueno = invert ? value <= 0 : value >= 0;

  const Flecha = value >= 0 ? TrendingUp : TrendingDown;

  if (presentation === 'inline') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 whitespace-nowrap font-mono text-delta tabular-nums',
          bueno ? 'text-success' : 'text-danger',
          className,
        )}
      >
        <Flecha className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden="true" />
        {formatPct(Math.abs(value), locale)}
      </span>
    );
  }

  return (
    /* `gap-1` ya no se escribe acá: bajó a `Badge` (CU-868knx0vh), donde lo hereda
       cualquier chip con ícono. Solo queda lo propio de este chip: la cifra va en
       minúscula, a diferencia del rótulo en mayúscula del resto. */
    <Badge variant={bueno ? 'success' : 'danger'} className={cn('normal-case', className)}>
      <Flecha className="h-3 w-3" strokeWidth={2} />
      {formatPct(Math.abs(value), locale)}
    </Badge>
  );
}
