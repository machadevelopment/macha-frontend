import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/cn';

// shadcn-style Button, restyled onto this project's own tokens (design guide.md
// §11.3) instead of shadcn's default CSS-var set — keeps a single token system
// rather than layering a second one for just this component.
/**
 * ACABADO (CU-868knx0vh). Las tres variantes y sus significados no cambian; lo que cambia
 * es que ahora hacen lo que el design guide §5 ya especificaba y el componente no cumplía:
 * "hover: #000 / dark #fff; active: scale/opacidad; focus-visible: ring; disabled: 0.5".
 *
 * ⚠️ LO QUE **NO** SE HIZO, y por qué: shadcn resuelve el ícono del botón con
 * `[&_svg]:size-4`. Acá sería un cambio silencioso en 29 archivos. Ese selector compila a
 * `.clase svg`, que tiene MÁS especificidad (0,1,1) que el `h-3.5 w-3.5` que el ícono
 * lleva puesto (0,1,0) — o sea que ganaría, y en este producto la convención de ícono
 * dentro de botón es 14px, no los 16 de shadcn. Habría reescalado cada botón con ícono
 * sin que apareciera en el diff. Solo se hereda `shrink-0`, que no pelea con ningún
 * tamaño: evita que el ícono se aplaste cuando el texto del botón es largo.
 *
 * EL HOVER DEL PRIMARIO ERA `opacity-90`, y eso es lo contrario de lo que pedía el guide:
 * bajar la opacidad DESTIÑE el botón contra el lienzo — deja pasar el fondo— cuando el
 * gesto tiene que intensificarlo. En modo oscuro era peor, porque el primario es claro y
 * el hover lo APAGABA justo al pasarle el cursor. Ahora va a un tono propio por tema
 * (`--primary-hover`: negro en claro, blanco en oscuro).
 *
 * El `outline` gana el borde en hover que el guide pedía (`--border-strong`) además del
 * fondo; antes solo cambiaba el fondo y el filete se quedaba igual de tenue, que es lo que
 * hacía que el botón secundario no se sintiera "presionable".
 */
const variantClasses = {
  default:
    'bg-primary text-primary-foreground shadow-btn hover:bg-[var(--primary-hover)] active:scale-[0.98]',
  ghost: 'hover:bg-muted active:scale-[0.98]',
  outline:
    'border border-border bg-transparent hover:border-[var(--border-strong)] hover:bg-muted active:scale-[0.98]',
} as const;

const sizeClasses = {
  default: 'px-[var(--density-btn-px)] py-[var(--density-btn-py)]',
  sm: 'px-[var(--density-btn-sm-px)] py-[var(--density-btn-sm-py)]',
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(
          // `gap-2` como default (quien necesite otro lo pasa por `className`, que se
          // aplica al final y gana en `cn`). El TAMAÑO del ícono no se toca acá — ver la
          // nota de arriba sobre por qué `[&_svg]:size-4` sería un cambio invisible.
          'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md text-body font-medium',
          '[&_svg]:shrink-0',
          // `transition-colors` no alcanzaba desde que hay `active:scale`: la transición
          // tiene que cubrir también `transform`, o el botón salta de golpe al pulsarlo.
          'transition-[background-color,border-color,color,transform,opacity] duration-150',
          'disabled:pointer-events-none disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
