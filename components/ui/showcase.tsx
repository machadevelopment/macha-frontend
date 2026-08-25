import { cn } from '@/lib/cn';
import { InsightPoint } from '@/components/ui/insight-point';
import { MachaMark } from '@/components/ui/macha-mark';

/**
 * VITRINA — las piezas compartidas de las pantallas de marca al 100% (CU-868knx0vh,
 * design guide.md §2.7: `/`, registro, `invitations/accept`, 404, error y la CABECERA de
 * un reporte).
 *
 * POR QUÉ EXISTE ESTE ARCHIVO Y NO CINCO COPIAS. El fondo ambiental del Insight Point no
 * es una clase: es una mancha posicionada en absoluto que **depende del contenedor que la
 * recorta** (lo dice la cabecera de `insight-point.tsx`). Escrita a mano en cada pantalla,
 * la primera que olvide el `overflow-hidden` deja el degradado salvia escapándose por
 * detrás del contenido — y la regla dura del sistema es que el salvia NUNCA queda detrás
 * de una tabla o una gráfica. Teniendo el marco, no hay ocasión de escribirlo mal.
 *
 * Ninguna de estas piezas es cliente: son marcado y tokens. Eso importa porque dos de sus
 * consumidores son los boundaries de error (`not-found`, `global-error`), donde cada
 * import que pueda fallar es un riesgo real.
 */

/**
 * Marco de vitrina: recorta la atmósfera y la coloca.
 *
 * Las dos manchas van descentradas y salidas del borde a propósito — una atmósfera
 * centrada se lee como un foco apuntando al texto, que es justo lo que el Brand Book no
 * quiere del Insight Point. `isolate` fija el contexto de apilado para que el contenido
 * quede encima sin repartir `z-index` por toda la pantalla.
 */
export function ShowcaseFrame({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('relative isolate overflow-hidden', className)}>
      <InsightPoint variant="ambient" className="-left-[15%] -top-[30%] h-[620px] w-[620px]" />
      <InsightPoint variant="ambient" className="-right-[18%] top-[35%] h-[420px] w-[420px]" />
      {children}
    </div>
  );
}

/**
 * El sello: el isotipo solo, como firma de la casa en la vitrina. Se repite idéntico en todas
 * las pantallas para que se lea como una marca y no como variaciones.
 *
 * ═══ SIN EL TILE SALVIA DETRÁS (reporte de Keneth, 2026-08-24) ═══
 *
 * Hasta acá era un `InsightPoint` —el cuadrado salvia redondeado— con el isotipo adentro. Y el
 * isotipo trae su propio degradado salvia, así que quedaba **salvia sobre salvia**: el logo se
 * lavaba contra su propio fondo. Keneth lo reportó desde la pantalla de registro —"le pusieron
 * un cuadro verde alrededor y por eso se ve raro"— y tenía razón: el mismo isotipo, en el
 * header de esa misma página, se lee perfecto porque está sobre blanco.
 *
 * Lo que se conserva y por qué: el sello sigue existiendo como pieza. Borrarlo dejaría el
 * eyebrow flotando sin nada que ancle la columna centrada, y esa función —dar un punto de
 * partida al ojo, arriba del texto— era buena. Lo que sobraba era el fondo, no la firma.
 *
 * El tamaño sube (40 / 28 px contra 24 / 18) porque antes el isotipo era el contenido de una
 * pieza más grande y ahora ES la pieza: al quitarle la caja necesita el peso que tenía el
 * conjunto, o el encabezado se queda sin ancla.
 */
export function ShowcaseSeal({ size = 'lg' }: { size?: 'md' | 'lg' }) {
  return <MachaMark className={size === 'lg' ? 'h-10 w-10' : 'h-7 w-7'} />;
}

/**
 * Cabecera de vitrina: sello + eyebrow + titular + bajada, centrados.
 *
 * El titular sube a `display` desde `sm` y no desde el breakpoint `app` (1080px): estas
 * pantallas son una columna angosta, no un tablero, así que el punto donde el titular
 * grande empieza a caber no tiene nada que ver con el punto donde cabe un sidebar.
 */
export function ShowcaseHeading({
  eyebrow,
  title,
  subtitle,
  className,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-4 text-center', className)}>
      <ShowcaseSeal />
      <div className="flex flex-col gap-2">
        <p className="font-mono text-eyebrow uppercase text-faint">{eyebrow}</p>
        <h1 className="text-h1 sm:text-display">{title}</h1>
        {subtitle && (
          <p className="mx-auto max-w-[52ch] text-body text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Clases de la acción principal de una vitrina.
 *
 * Son clases y no el `<Button>` de shadcn por dos razones concretas: la mitad de estas
 * pantallas necesita un `<a>` de verdad (navegación entre rutas sin JS de por medio, que
 * es lo que sostiene `/` y el 404 aunque todo lo demás falle), y `global-error` tiene la
 * regla explícita de no importar nada que pueda romperse dentro del manejador de errores.
 * El acabado sí es el mismo que el del botón primario: mismos tokens de densidad, mismo
 * radio, mismo `hover`.
 *
 * El CTA de vitrina es TINTA, no salvia: el salvia es superficie y acento (es claro y de
 * bajo contraste), y un botón primario pintado de marca sería ilegible además de contrario
 * a la regla. La marca la pone el sello y la atmósfera.
 */
export const showcaseCta =
  'inline-flex items-center justify-center rounded-md bg-primary px-[var(--density-btn-px)] py-[var(--density-btn-py)] text-body text-primary-foreground transition-opacity hover:opacity-90';

/** Acción secundaria (salir, reintentar): el contorno del botón `outline`. */
export const showcaseCtaSecondary =
  'inline-flex items-center justify-center rounded-md border border-border bg-transparent px-[var(--density-btn-px)] py-[var(--density-btn-py)] text-body text-foreground transition-colors hover:bg-muted';
