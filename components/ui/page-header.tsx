import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Cabecera de pantalla — CU-868kt8bg0, Fase 3 (página por página).
 *
 * ═══ QUÉ ESTABA MAL ═══
 *
 * El equipo de Macha reportó que "el título aparece dos veces" y que la plataforma
 * "desperdicia pantalla". Las dos quejas son el mismo defecto y se ven juntas al abrir
 * cualquier pantalla: nuestras páginas abrían con TRES líneas apiladas —
 *
 *     ANALÍTICA                  ← eyebrow, monoespaciada, mayúsculas
 *     Cómo va tu negocio         ← h1, 27px, peso 700
 *     Cómo se movieron tus...    ← subtítulo
 *
 * — mientras el ítem del menú lateral, a la izquierda y a la misma altura, ya decía
 * "Analítica". El eyebrow no aportaba nada que la navegación no dijera ya: repetía el
 * nombre de la sección en la que el usuario acababa de hacer clic. Tres líneas de alto
 * para una información que ya estaba en pantalla, en el borde superior, que es el espacio
 * más caro de un dashboard.
 *
 * ═══ EL PATRÓN DEL PROTOTIPO ═══
 *
 * El prototipo titula sus DIEZ páginas exactamente igual, sin una sola excepción
 * (`src/pages/*.tsx`): ícono de 20px + `<h1 class="text-xl font-semibold">` **en la misma
 * línea**, y las acciones de la pantalla empujadas al extremo derecho de esa misma fila.
 * Ni un eyebrow en todo el repositorio. Cuando hay subtítulo (`Team.tsx`) va colgando del
 * título dentro del mismo bloque, en 12px tenue — no como tercera línea suelta.
 *
 * Tres líneas pasan a una, y la fila que antes solo titulaba ahora además ACTÚA: el botón
 * de cada pantalla sube a ocupar el hueco de la derecha que estaba vacío.
 *
 * ═══ EL ÍCONO VA EN TINTA, NO EN VERDE ═══
 *
 * El prototipo lo pinta con `text-primary`, y su `--primary` es `0 0% 9%` — NEGRO, no el
 * acento. Es fácil leer "primary" como "el color de marca" y pintarlo salvia; sería
 * exactamente lo que la regla de los dos verdes prohíbe (el color de marca no decora
 * cromo de navegación) y además contradiría la jerarquía que el propio ticket pide:
 * negro para lo principal, gris para lo secundario, verde/rojo SOLO para señal.
 *
 * ═══ POR QUÉ UN COMPONENTE Y NO UN COPY-PASTE ═══
 *
 * La queja de fondo es de CONSISTENCIA. Diez páginas con la misma cabecera escrita diez
 * veces vuelven a divergir en el primer cambio; con una sola definición, "unificar el
 * tamaño y grosor de íconos, títulos y botones" deja de ser una revisión manual y pasa a
 * ser cierto por construcción.
 */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  /** Opcional a propósito: el prototipo solo lo usa donde el nombre no basta. */
  subtitle?: string;
  /** Botones de la pantalla. Van en ESTA fila, no en una barra propia debajo. */
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {/* `shrink-0`: sin él, un título largo en una pantalla angosta aplasta el ícono
            hasta convertirlo en una raya. */}
        <Icon className="h-5 w-5 shrink-0 text-ink" strokeWidth={1.7} aria-hidden />
        <div className="min-w-0">
          <h1 className="text-pagetitle">{title}</h1>
          {subtitle && <p className="text-caption text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}
