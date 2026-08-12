import { cn } from '@/lib/cn';

/**
 * Isotipo de Macha: tres barras ascendentes (Brand Book, CU-868knx0vh).
 *
 * Hasta ahora la marca en producto era SOLO el wordmark "Macha" en texto. El isotipo
 * existía en el Brand Book y no estaba en ninguna pantalla, así que el producto no tenía
 * ningún elemento gráfico de marca — ni siquiera para el favicon o para una cabecera de
 * correo.
 *
 * SVG inline y no un archivo: son cuatro rects, pesa menos que la request que costaría
 * traerlo, y sobre todo hereda `currentColor`. Eso es lo que permite que el mismo
 * componente sirva en el sidebar (tinta), sobre el salvia (tinta oscura) y en la
 * superficie inversa del backoffice (tinta clara) sin tres variantes de archivo.
 *
 * `aria-hidden` por defecto: donde aparece, va acompañado del wordmark "Macha" en texto,
 * así que anunciarlo sería repetir el nombre de la marca dos veces a un lector de
 * pantalla. Quien lo use SIN texto al lado debe pasar un `label`.
 */
export function MachaMark({ className, label }: { className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn('h-[18px] w-[18px]', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/*
        Tres barras ascendentes, no un gráfico literal: las alturas (10 / 15 / 20 sobre
        24) crecen a paso constante para que se lea como progresión y no como datos
        reales. El radio de 1.5 es el mismo lenguaje de esquina que el resto del sistema.
      */}
      <rect x="3" y="14" width="4.5" height="7" rx="1.5" fill="currentColor" opacity="0.45" />
      <rect x="9.75" y="9" width="4.5" height="12" rx="1.5" fill="currentColor" opacity="0.72" />
      <rect x="16.5" y="4" width="4.5" height="17" rx="1.5" fill="currentColor" />
    </svg>
  );
}
