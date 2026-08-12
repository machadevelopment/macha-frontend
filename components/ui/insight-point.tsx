import { cn } from '@/lib/cn';

/**
 * Insight Point — el gradiente radial salvia del Brand Book, como componente reutilizable
 * (CU-868knx0vh).
 *
 * Es el único elemento del sistema que usa el verde de MARCA, y por eso existe como
 * componente en vez de como una clase suelta: concentrar el salvia en un solo lugar es lo
 * que evita que se filtre a los datos. La regla de los dos verdes (ver `globals.css`) se
 * cae en el momento en que alguien escribe `bg-brand` sobre un KPI; teniendo el
 * componente, no hay razón para escribirlo.
 *
 * DÓNDE VA: identidad y vitrina — el sello del asesor, la cabecera de reportes, las
 * pantallas de registro/login/invitación. NUNCA sobre un dato, un delta o un chip de
 * estado; ahí el color lo pone `success`/`danger`.
 *
 * El gradiente vive en `--brand-gradient` y no acá, así que el degradado se ajusta en un
 * solo archivo y este componente solo decide tamaño y contenido.
 */
export function InsightPoint({
  size = 'md',
  className,
  children,
  label,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Un ícono, normalmente. Se pinta con `--brand-on`, la tinta legible sobre el salvia. */
  children?: React.ReactNode;
  /** Solo si el punto aparece SIN texto que ya lo explique. */
  label?: string;
}) {
  const dims = {
    sm: 'h-6 w-6',
    md: 'h-9 w-9',
    lg: 'h-14 w-14',
  }[size];

  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        // `bg-insight` es la utilidad que expone `--brand-gradient` (tailwind.config).
        'inline-flex shrink-0 items-center justify-center rounded-pill bg-insight text-[var(--brand-on)]',
        dims,
        className,
      )}
    >
      {children}
    </span>
  );
}
