import { cn } from '@/lib/cn';

/**
 * Isotipo de Macha: tres barras verticales con degradado contrapuesto (Brand Book).
 *
 * ⚠️ CORREGIDO al llegar los assets. La primera versión (CU-868knx0vh) dibujaba tres barras
 * ASCENDENTES tipo gráfica de barras, con alturas 7/12/17 y opacidades distintas. Eso NO es
 * el isotipo: se construyó a partir de la descripción del ticket ("tres barras") antes de
 * que el Brand Book estuviera en el repo.
 *
 * El isotipo real, muestreado de `Macha-Veintitres/LOGO/ISOTIPO/PNG`:
 *   · tres barras de IGUAL ancho y ALTURA COMPLETA, no escalonadas;
 *   · cada una con un degradado VERTICAL entre el claro del Brand Book (#F4F4F2) y el
 *     salvia (#A1B09B);
 *   · y el detalle que le da el carácter: la barra CENTRAL lleva el degradado INVERTIDO.
 *     Las exteriores van claro→salvia de arriba abajo; la central, salvia→claro. Ese
 *     contrapunto es lo que hace que el conjunto se lea como movimiento y no como tres
 *     rectángulos.
 *
 * POR QUÉ SVG INLINE Y NO EL PNG DEL BRAND BOOK. Los assets vienen solo en PNG y JPG, sin
 * vector. Un PNG de 755×889 pesa más que este SVG, se ve borroso en pantallas normales a
 * 18px, no se adapta al modo oscuro y obliga a una request. El SVG reproduce la geometría
 * exacta y toma los colores de los tokens, así que en oscuro el degradado cambia con el
 * tema (ver `--brand-bar` en globals.css).
 *
 * NO SE RECOLOREA NI SE DEFORMA — el manual lo prohíbe expresamente. Por eso los degradados
 * salen de los tokens de MARCA y no de `currentColor`: el isotipo tiene sus colores y no los
 * hereda del texto de al lado. Cuando se necesita una versión monocroma (superficie inversa
 * del backoffice), se usa `monochrome`, que es el uso que el manual sí contempla.
 */
export function MachaMark({
  className,
  label,
  monochrome = false,
}: {
  className?: string;
  label?: string;
  /**
   * Versión de una sola tinta, heredando `currentColor`. Para la superficie inversa del
   * backoffice y cualquier fondo donde el degradado salvia no tenga contraste suficiente.
   */
  monochrome?: boolean;
}) {
  // `id` único por instancia: dos isotipos en la misma página con el mismo id de gradiente
  // hacen que el segundo herede el del primero. Pasa en el shell, donde el sidebar y el
  // topbar móvil se montan los dos.
  const uid = monochrome ? 'mono' : 'grad';

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('h-[18px] w-[18px]', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {!monochrome && (
        <defs>
          {/* Los `stop-color` leen los primitivos de marca directamente porque un
              `linear-gradient` de CSS no se puede aplicar a un `fill` de SVG. Es la única
              vía, y sigue siendo token: no hay hex escrito acá. */}
          <linearGradient id={`macha-bar-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-light)" />
            <stop offset="100%" stopColor="var(--brand)" />
          </linearGradient>
          <linearGradient id={`macha-bar-inv-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" />
            <stop offset="100%" stopColor="var(--brand-light)" />
          </linearGradient>
        </defs>
      )}

      {/*
        Tres barras de altura completa. Los anchos y separaciones respetan la proporción del
        asset (barra ≈ 27% del ancho total, aire ≈ 9%), que es lo que el manual llama área de
        seguridad interna: apretarlas más convierte el isotipo en un bloque.
      */}
      {[
        { x: 1.5, inverse: false },
        { x: 9.4, inverse: true },
        { x: 17.3, inverse: false },
      ].map(({ x, inverse }) => (
        <rect
          key={x}
          x={x}
          y="1"
          width="5.2"
          height="22"
          rx="0.6"
          fill={monochrome ? 'currentColor' : `url(#macha-bar-${inverse ? 'inv-' : ''}${uid})`}
        />
      ))}
    </svg>
  );
}
