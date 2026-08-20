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
        /*
          ═══ CU-868ku9rpy · `min-w-0` DE FÁBRICA ═══

          Tres bugs distintos de la ronda del 19-ago resultaron ser el MISMO mecanismo, y
          los tres se reportaron como cosas que no se parecen entre sí:

            · CU-868ktkk3g — "la pantalla de Inventario no desliza a la derecha"
            · CU-868ku9q7c — "los números de los KPIs se corren y miden distinto"
            · CU-868ku9u0j — "la tarjeta del donut se sale de la vista"

          Un hijo de grid o de flex tiene `min-width: auto`, o sea su ancho de MIN-CONTENT.
          Una cifra larga, una celda con `whitespace-nowrap` o un nombre de producto empujan
          ese mínimo, la tarjeta se niega a encogerse a su fracción, y el resto de la fila se
          aprieta o se sale. Peor: cualquier `overflow-x-auto` que haya adentro nunca llega a
          ver un desbordamiento, porque el contenedor creció con el contenido — por eso el de
          Inventario "no funcionaba" teniendo el overflow puesto.

          Se pone acá y no en cada uso por lo que ya demostraron esos tres tickets: su
          ausencia NO falla de forma visible, así que ninguna revisión la atrapa y reaparece
          cada vez que alguien mete una Card en un grid nuevo. La auditoría encontró Cards sin
          él en reportes, inventario, analítica, alertas y admin.

          Es seguro por defecto: fuera de un contenedor flex/grid, `min-width: 0` no cambia
          nada — el ancho lo sigue fijando el bloque. Y donde una tarjeta necesite de verdad
          no encogerse, `className` lo sobreescribe.
        */
        'min-w-0 rounded-lg border border-border bg-card p-[var(--density-card-p)] text-card-foreground shadow-card',
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
