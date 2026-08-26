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
 * ═══ CON `state` NO ES UN DISCO: ES UN ORBE DE TRES CAPAS ═══
 *
 * Y esa es la diferencia estructural, no un detalle de estilo. Sin `state`, el `<span>` ES el
 * sello: un disco con el degradado de marca. Con `state`, el `<span>` pasa a ser la CAJA y
 * adentro se montan tres capas independientes —halo, anillo y núcleo— siguiendo
 * `asesor_ia_nucleo_integrado.html`, el archivo que Keneth fijó como fuente de verdad:
 *
 *   · `.ip-glow` (inset -22 %) — el halo que respira. En los cuatro estados.
 *   · `.ip-ring` (inset  1,5 %) — el aro cónico girando, recortado por `mask`. Desde `md`.
 *   · `.ip-core` (inset   14 %) — la ESFERA: degradado de cuatro paradas, dos sombras
 *     internas y un brillo que se pasea por encima. Es el 72 % de la caja, no el 100 %.
 *
 * Los cuatro estados salen de ese mismo archivo:
 *
 *   · `idle`      — el halo respira y el brillo se pasea por el cuerpo. Nada más.
 *   · `listening` — el halo respira más rápido y el NÚCLEO pulsa de escala (el anillo no).
 *   · `thinking`  — el anillo gira más rápido y a plena opacidad. Está trabajando.
 *   · `speaking`  — aparece el ecualizador debajo. Está contestando.
 *
 * El detalle de cada capa, con la tabla de equivalencias contra los `inset` en píxeles del
 * archivo, está en el bloque `ip-*` de `globals.css`.
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
    /*
     * 64px, que es el `hero` del HTML de referencia (antes 80px). No es un ajuste de gusto:
     * con el núcleo al 14 % de inset, una caja de 80px daba una esfera de 57px contra los
     * 46px del archivo — un cuerpo 25 % más grande dentro del mismo halo. Bajando la caja al
     * valor del archivo, las tres capas caen donde caen ahí.
     */
    xl: 'h-16 w-16',
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
   * El anillo, a partir de `md`. El HTML de referencia lo monta en sus DOS tamaños —el `hero`
   * de 64px y el `chip` de 34px—, así que la versión anterior ("solo en `lg` y `xl`, a 36px se
   * lee como un borrón") describía una caja que no era esta: ahí el aro rodeaba al `<span>`
   * entero desde afuera. Ahora rodea al núcleo, que ocupa el 72 % de la caja, y con el trazo
   * bajado a 1,5px se lee como anillo igual que en el archivo. Se excluye `sm` (24px), que es
   * más chico que cualquier tamaño del archivo y ahí sí sería un borrón.
   */
  const conAnillo = state !== undefined && size !== 'sm';

  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        // ⚠️ `rounded-full`, NUNCA `rounded-pill`. Es la excepción deliberada a "los radios
        // salen de la escala del sistema", y la escribió un bug en producción (reporte de
        // Keneth 2026-08-26: *"pusiste un cuadrado no un círculo"*). `rounded-pill` vale
        // **22px fijos**, no "la mitad": a `sm` (24px) y `md` (36px) el radio excede el medio
        // lado y el navegador lo recorta a círculo, así que durante semanas el token pareció
        // correcto. A `xl` (80px) no lo recorta nada y el sello del asesor salió cuadrado con
        // las esquinas romas — en la pantalla de bienvenida del chat, donde el círculo ES la
        // figura. Un radio en píxeles NO puede describir un círculo: describe un círculo
        // solo para los tamaños donde el número le gana al lado, y este componente tiene
        // cuatro tamaños. `rounded-full` (9999px) es correcto en los cuatro por construcción,
        // que es exactamente lo que ya hacen `.ip-glow` y `.ip-ring` unas líneas más abajo en
        // `globals.css` — las capas ya eran redondas y solo el núcleo no.
        'inline-flex shrink-0 items-center justify-center rounded-full',
        /*
         * ⚠️ EL FONDO SOLO EXISTE SIN `state`, y es el cambio que trajo el orbe del HTML.
         *
         * Con `state`, el `<span>` deja de ser la esfera y pasa a ser la CAJA del orbe: la
         * esfera es `.ip-core`, metida adentro al 14 %. Si además se pintara `bg-insight` acá,
         * quedaría un disco salvia a tamaño completo por detrás del núcleo — o sea el orbe
         * apoyado sobre su propia silueta, tapando el aire donde tienen que verse el anillo y
         * el halo. Es exactamente lo que hacía antes, y por eso el cuerpo se veía demasiado
         * grande para su halo.
         *
         * Sin `state` no cambia nada: sello plano, como el wizard y la landing lo usan.
         */
        !state && 'bg-insight text-[var(--brand-on)]',
        dims,
        // `ip-anim` da el `position: relative` que las capas necesitan y fija `--ip-rim`.
        // Sin `state` no se agrega ninguna clase, así que el elemento sale idéntico al de antes.
        state && 'ip-anim',
        // El trazo fino del archivo para el tamaño `chip`. Nuestro `md` (36px) es su 34px.
        state && (size === 'sm' || size === 'md') && 'ip-chip',
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
      {/*
        La esfera. Va DESPUÉS del anillo en el DOM y eso no es casual: sin `z-index` de por
        medio, el orden de pintado es el orden del documento, y el núcleo tiene que quedar
        por encima del cónico para que el aro se vea rodeándolo y no cruzándolo.
      */}
      {state ? <span aria-hidden className="ip-core" /> : null}
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
