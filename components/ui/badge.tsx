import * as React from 'react';
import { cn } from '@/lib/cn';

// design guide.md §5 "Chip / tag" (`.chip .g/.r/.a/.n`) — the 4 semantic variants,
// always text+bg+border together (§1 rule 3), never color-only.
const variantClasses = {
  success: 'text-success bg-success-bg border-success-bd',
  danger: 'text-danger bg-danger-bg border-danger-bd',
  warning: 'text-warning bg-warning-bg border-warning-bd',
  neutral: 'text-muted-foreground bg-muted border-border',
  /**
   * CU-868knx0vh — chip de MARCA, y no es una quinta semántica de estado: es identidad.
   *
   * SOLO PARA VITRINA (registro, invitación, cabecera de reporte). Un chip salvia sobre un
   * dato rompe la regla de los dos verdes: si el chip califica algo —cobrado, vencido, en
   * riesgo— es `success`/`danger`/`warning`, siempre. Este dice "esto lo dice Macha"
   * (p. ej. el plan recomendado del catálogo), nunca "este número va bien".
   *
   * La tinta es `brand-ink` y no `brand-on`: `brand-on` es la tinta SOBRE el salvia y en
   * oscuro quedaría negra sobre el `brand-soft` casi negro. Mantiene la tripleta
   * texto+fondo+borde como el resto de los chips.
   */
  brand: 'text-brand-ink bg-brand-soft border-brand-bd',
} as const;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variantClasses;
}

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[5px] border px-1.5 py-0.5 font-mono text-chip uppercase',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
