import * as React from 'react';
import { cn } from '@/lib/cn';

// design guide.md §5 "Chip / tag" (`.chip .g/.r/.a/.n`) — the 4 semantic variants,
// always text+bg+border together (§1 rule 3), never color-only.
const variantClasses = {
  success: 'text-success bg-success-bg border-success-bd',
  danger: 'text-danger bg-danger-bg border-danger-bd',
  warning: 'text-warning bg-warning-bg border-warning-bd',
  neutral: 'text-muted-foreground bg-muted border-border',
} as const;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variantClasses;
}

/**
 * ACABADO (CU-868knx0vh). El significado del color NO cambia: siguen siendo las mismas
 * cuatro semánticas y siguen apareciendo como texto+fondo+borde juntos. Lo que se sube es
 * el acabado, que estaba en lo mínimo:
 *
 *   · `align-middle` + `leading-none`: el chip se alineaba por la línea base de su texto,
 *     así que al lado de una cifra grande (Analítica pone `DeltaBadge` junto a un
 *     `text-statbig`) quedaba montado un par de píxeles arriba. Se veía como un error de
 *     maquetación y era el chip pidiendo su propia caja.
 *   · `gap-1`: `DeltaBadge` lo escribía por fuera, y era el único chip con ícono porque
 *     replicarlo a mano no era obvio. Al bajar acá, cualquier chip con ícono lo hereda.
 *     El TAMAÑO del ícono no baja con él, a propósito: `[&>svg]:size-3` compila a
 *     `.clase > svg` y gana en especificidad (0,1,1) sobre el `h-3 w-3` que el ícono
 *     lleva puesto (0,1,0). Hoy coinciden en 12px, pero fijarlo acá le quitaría a cada
 *     chip la capacidad de elegir el suyo sin que se note en el diff. Solo se hereda
 *     `shrink-0`, que no compite con ningún tamaño.
 *   · `whitespace-nowrap`: un chip partido en dos líneas deja de leerse como chip; dentro
 *     de una celda estrecha pasaba.
 *
 * `font-mono` SE QUEDA: es una etiqueta en mayúscula con tracking, que es exactamente lo
 * que la regla mono revisada sigue reservando para la monoespaciada. La cifra que a veces
 * lleva dentro (`DeltaBadge`) es corta y va con el rótulo, no en una columna que alinear.
 */
export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-[5px] border px-1.5 py-0.5 align-middle font-mono text-chip uppercase leading-none',
        'transition-colors [&>svg]:shrink-0',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
