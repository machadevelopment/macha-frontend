import * as React from 'react';
import { cn } from '@/lib/cn';

/**
 * design guide.md §5 "Card genérica" (`.card`, `.card-t`/`.card-h2`) — density-aware padding.
 *
 * Rediseño Brand Book: se suma `shadow-card`. El filete de 1px se queda —sostiene la
 * separación donde la sombra no se ve— pero solo, se leía plano contra el prototipo
 * premium: delimitaba la tarjeta sin despegarla del lienzo. La sombra es deliberadamente
 * corta (1px + 2px, alfa bajo): el registro del producto sigue siendo plano, la tarjeta se
 * despega del blanco hueso, no flota.
 */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // CU-868kt8bg0: `rounded-lg` (10px) y no `xl` (11px). El ticket pide "mantener el
        // mismo redondeado en todos los componentes", y el prototipo usa `rounded-lg` —que
        // en su escala ES `--radius`— para las tarjetas. Un píxel no se ve solo; se ve al
        // lado de un botón o un input que sí usan la escala base.
        'rounded-lg border border-border bg-card p-[var(--density-card-p)] text-card-foreground shadow-card',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-between gap-2 pb-3', className)}
      {...props}
    />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-cardh2', className)} {...props} />
));
CardTitle.displayName = 'CardTitle';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn(className)} {...props} />,
);
CardContent.displayName = 'CardContent';
