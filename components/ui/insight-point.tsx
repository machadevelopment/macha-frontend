import { cn } from '@/lib/cn';

/**
 * Insight Point — el recurso gráfico del Brand Book que representa el origen de la
 * información. El manual lo define como un gradiente radial salvia, difuminado.
 *
 * ⚠️ CORREGIDO al llegar los assets: el gradiente de la primera versión inventaba una
 * tercera parada oscura (#7F9077) que no existe en el Brand Book. El degradado real va
 * entre el salvia (#A1B09B) y el claro (#F4F4F2), y nada más — muestreado del isotipo.
 *
 * ES EL ÚNICO ELEMENTO DEL SISTEMA QUE USA EL VERDE DE MARCA, y por eso existe como
 * componente en vez de como una clase suelta: concentrar el salvia en un solo lugar es lo
 * que evita que se filtre a los datos. La regla de los dos verdes se cae en el momento en
 * que alguien escribe `bg-brand` sobre un KPI; teniendo el componente, no hay razón para
 * escribirlo.
 *
 * ═══ DOS MODOS, Y LA DIFERENCIA IMPORTA ═══
 *
 * `figure` (default) — el punto como OBJETO: sello del asesor, avatar de marca, acento
 * junto a un título. Opaco, con el degradado nítido.
 *
 * `ambient` — el punto como ATMÓSFERA: una mancha muy difuminada y con alfa, detrás de un
 * bloque de vitrina. Se posiciona en absoluto y no captura el puntero.
 *
 * ═══ DÓNDE NO VA ═══
 *
 * **NUNCA detrás de una tabla o una gráfica.** Es instrucción explícita del prompt de
 * rediseño y tiene una razón que va más allá del gusto: el salvia compite con el verde
 * funcional de las series y los deltas, y un fondo verdoso bajo una cifra hace dudar de si
 * el color pertenece al dato. Va en vitrina, en el estado vacío del dashboard, en la
 * cabecera de reportes y como acento de marca.
 *
 * Tampoco va en `/admin/*`: el backoffice es premium sobrio, sin decoración de marca.
 *
 * ═══ EL PROP `state` LE DA PERSONALIDAD, Y ES OPCIONAL A PROPÓSITO ═══
 *
 * Sin `state`, el componente se comporta EXACTAMENTE como antes. Eso no es cortesía con el
 * código viejo: `InsightPoint` se usa hoy en cinco lugares y solo dos de ellos son el asesor.
 * El wizard de registro y la cabecera de un reporte quieren un sello quieto, y un anillo
 * girando ahí sería ruido en una pantalla que no está esperando nada.
 *
 * Los cuatro estados salen del mockup que Jose validó:
 *
 *   · `idle`      — el glow respira despacio. Nada más.
 *   · `listening` — respira más rápido y el núcleo pulsa de escala. El asesor tiene algo que oír.
 *   · `thinking`  — el anillo gira más rápido. Está trabajando.
 *   · `speaking`  — aparece el ecualizador. Está contestando.
 *
 * El detalle de cada capa —y por qué el anillo no se monta en los tamaños chicos— está en el
 * bloque `ip-*` de `globals.css`.
 */
export function InsightPoint({
  size = 'md',
  variant = 'figure',
  state,
  className,
  children,
  label,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'figure' | 'ambient';
  /**
   * Qué está haciendo el asesor. Omitirlo deja el punto estático, como siempre.
   *
   * Solo aplica a `variant="figure"`: la mancha `ambient` es atmósfera de fondo y animarla
   * sería una distracción detrás del contenido, no una señal.
   */
  state?: 'idle' | 'listening' | 'thinking' | 'speaking';
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
    xl: 'h-20 w-20',
  }[size];

  if (variant === 'ambient') {
    return (
      /*
       * `aria-hidden` sin excepción y `pointer-events-none`: es atmósfera. Anunciarlo a un
       * lector de pantalla o dejar que intercepte un clic serían las dos formas de que un
       * fondo decorativo estorbe.
       *
       * Sin `overflow-hidden` propio: lo recorta el contenedor que lo posiciona, que es
       * quien sabe hasta dónde debe llegar la mancha.
       */
      <span
        aria-hidden
        className={cn('pointer-events-none absolute bg-insight-glow blur-2xl', className)}
      />
    );
  }

  /*
   * El anillo solo en `lg` y `xl`. A 24px y 36px un aro de 2px girando se lee como un borrón
   * alrededor del sello, no como un anillo — verificado sobre el mockup.
   */
  const conAnillo = state !== undefined && (size === 'lg' || size === 'xl');

  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-pill bg-insight text-[var(--brand-on)]',
        dims,
        // `ip-anim` da el `position: relative` que las capas necesitan. Sin `state` no se
        // agrega ninguna clase, así que el elemento sale idéntico al de antes.
        state && 'ip-anim',
        state === 'listening' && 'ip-listening',
        state === 'thinking' && 'ip-thinking',
        className,
      )}
    >
      {/*
        Las capas van `aria-hidden`: son decoración. Lo que un lector de pantalla necesita
        saber del estado del asesor lo dice el TEXTO de la pantalla ("Pensando…"), no el sello.
      */}
      {state ? <span aria-hidden className="ip-glow" /> : null}
      {conAnillo ? <span aria-hidden className="ip-ring" /> : null}
      {state === 'speaking' ? (
        <span aria-hidden className="ip-eq">
          <span />
          <span />
          <span />
          <span />
        </span>
      ) : null}
      {children}
    </span>
  );
}
