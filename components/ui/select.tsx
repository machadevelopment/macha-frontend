import * as React from 'react';
import { cn } from '@/lib/cn';

/**
 * Desplegable nativo, con la forma del sistema — CU-868ku9rpy.
 *
 * ═══ POR QUÉ EXISTE ═══
 *
 * La auditoría de paridad visual encontró `<select>` escritos a mano en OCHO archivos, con
 * cuatro combinaciones de clases distintas para el mismo control:
 *
 *     rounded-md border border-border bg-surface px-2 py-1 text-body      (equipo)
 *     rounded-md border border-border bg-card px-3 py-2 text-body         (admin/créditos)
 *     h-9 rounded-md border border-input bg-background px-3 text-body     (inventario)
 *     h-9 rounded-md border border-border bg-background px-3 text-body    (registro)
 *
 * Cuatro fondos, dos tokens de borde, tres rellenos. Ninguna se ve mal por sí sola, y eso
 * es justamente el problema: la diferencia solo aparece cuando dos de ellas caen en la misma
 * sesión, que es cuando alguien reporta que "la app se ve inconsistente" sin poder señalar
 * dónde. `Input` y `Button` ya viven acá; el desplegable se había quedado fuera.
 *
 * ═══ POR QUÉ NATIVO Y NO RADIX ═══
 *
 * El proyecto usa shadcn/ui (Radix) y Radix tiene su propio `Select`, que es un botón con un
 * menú flotante. No se trae por dos razones: es una dependencia nueva para un control que ya
 * funciona, y el nativo se comporta mejor en móvil —el sistema operativo dibuja su propio
 * selector, con el que la gente ya sabe interactuar— que es donde más se usa esta app.
 *
 * Se calca `Input` a propósito: relleno por token de densidad, `bg-card`, borde `border` y el
 * mismo anillo de foco. Un desplegable y un campo de texto en la misma fila de formulario
 * tienen que verse hermanos, y hasta ahora no lo eran en ninguna de las cuatro variantes.
 *
 * `appearance-none` NO se pone: quita la flecha del sistema y obligaría a dibujar una a mano
 * (un `background-image` en SVG, que además hay que teñir en modo oscuro). La flecha nativa
 * es la señal de que esto se despliega, y se ve consistente porque el navegador la pinta con
 * el color del texto.
 */
export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  /** Marca el borde en rojo. Mismo contrato que `Input`. */
  error?: boolean;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'rounded-md border bg-card text-body text-foreground outline-none transition-colors',
        'px-[var(--density-input-px)] py-[var(--density-input-py)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:ring-2 focus-visible:ring-ring',
        error ? 'border-danger' : 'border-border',
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = 'Select';
