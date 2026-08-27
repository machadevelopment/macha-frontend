import Image from 'next/image';
import { InsightPoint } from '@/components/ui/insight-point';
import { ANCLA_DEMO } from '@/components/landing/demo-link';
import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * Hero de la landing: eyebrow, titular, bajada, dos acciones y el mockup del producto.
 *
 * ═══ EL TITULAR ES 88px CON PESO 400 (token `hero`) ═══
 *
 * No es `display` (38px/700). La diferencia importa y va al revés de lo que uno esperaría: en una
 * landing el titular es GRANDE Y FINO, y eso es lo que lo hace leerse como portada. A 88px el peso
 * 700 sería un muro. Ver la tabla de medición en `tailwind.config.ts`.
 *
 * ═══ EL DEGRADADO SALVIA ES `InsightPoint` EN MODO ATMÓSFERA ═══
 *
 * El Figma trae una mancha verde difuminada arriba a la derecha. Es exactamente lo que
 * `variant="ambient"` hace, así que no hay CSS nuevo ni un hex suelto: es el mismo recurso de
 * marca que usa el resto del producto.
 *
 * Y acá el salvia SÍ corresponde, sin conflicto con la regla de los dos verdes: en una landing no
 * hay un solo dato en pantalla. La prohibición es "nunca detrás de una tabla o una gráfica",
 * porque ahí compite con el verde funcional de los deltas — y el único sitio con deltas de esta
 * página es el mockup, que es una IMAGEN y está muy por debajo de la mancha.
 *
 * ═══ EL MOCKUP ES UNA IMAGEN, DECIDIDO CON KENETH ═══
 *
 * Es un PNG exportado del Figma a 2x (`public/landing/mockup-resumen.png`), no un dashboard
 * reconstruido en HTML. El intercambio: se ve idéntico al diseño y no se adapta al tema oscuro.
 * Para un mockup decorativo es el cambio correcto — no muestra datos de nadie, es una foto del
 * producto, y reconstruirlo sería mucho trabajo para que igual no quedara idéntico.
 *
 * `next/image` y no `<img>`: sirve el PNG optimizado y en el formato que soporte el navegador, que
 * en una imagen de 2632px de ancho es la diferencia entre 400 KB y unas decenas. `priority`
 * porque está en la primera pantalla — sin eso Next la carga en diferido y el hueco se ve.
 *
 * ═══ EL HERO OCUPA EL ALTO DE LA VENTANA (CU-868kx4374, reporte de Jose 2026-08-26) ═══
 *
 * *"El primer slide se ve mal puesto, tal vez volverlo tipo pantalla completa."* La captura dice
 * qué es "mal puesto", y no era el titular: el mockup del producto **entraba cortado por el
 * pliegue** — se veía su borde superior y nada más, así que la primera pantalla terminaba en una
 * imagen a medias en vez de en una portada.
 *
 * ⚠️ `min-h` SOLO NO ARREGLA NADA, Y ES LA TRAMPA DE ESTE TICKET. Estirar la sección al alto de
 * la ventana sin tocar el resto AGREGA espacio: el contenido queda igual y el mockup se va más
 * abajo todavía. Lo que hace que quepa es que el hueco entre el texto y el mockup deje de ser
 * fijo. Era `mt-20` (80px) quemado; ahora es `mt-auto` con piso `mt-12`:
 *
 *   · en una pantalla alta el `auto` crece y el mockup se apoya abajo, como una portada;
 *   · en una baja se encoge hasta 48px y el mockup sigue entrando;
 *   · y por debajo de eso la sección simplemente crece y hay scroll, que es lo correcto —
 *     recortar el titular para que quepa una imagen decorativa sería el intercambio al revés.
 *
 * `100dvh` y no `100vh`: en un móvil `vh` cuenta la barra del navegador aunque esté visible, así
 * que el hero mediría más que la pantalla y el mockup volvería a quedar cortado justo en el
 * dispositivo donde menos espacio hay. Los `4rem` que se restan son el nav fijo (64px medidos).
 *
 * El relleno de la banda se acompaña desde `app/page.tsx` (`paddingInferior`): con el `pb-32` de
 * una banda normal sumado al `min-h`, el conjunto vuelve a medir más que la ventana.
 */
export function LandingHero({ labels }: { labels: Dictionary['landing'] }) {
  return (
    <section className="relative flex min-h-[calc(100dvh-4rem)] flex-col">
      {/*
        La mancha de marca. `aria-hidden` y sin capturar el puntero lo pone el componente.
        Se recorta con el `overflow-hidden` de este contenedor: si se desbordara, empujaría el
        ancho de la página y aparecería una barra horizontal en móvil.
      */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <InsightPoint variant="ambient" className="-right-40 -top-56 h-[620px] w-[620px]" />
      </div>

      <p className="text-leyebrow uppercase text-muted-foreground">{labels.hero.eyebrow}</p>

      {/* `max-w` en CARACTERES y no en píxeles: lo que hace legible un titular es cuántas
          palabras entran por línea, y eso no cambia con el tamaño de la pantalla. */}
      <h1 className="mt-5 max-w-[22ch] text-hero text-foreground">{labels.hero.title}</h1>

      <p className="mt-8 max-w-[58ch] text-lhero text-muted-foreground">{labels.hero.subtitle}</p>

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <a
          href={ANCLA_DEMO}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3.5 text-[17px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {labels.hero.demo}
          {/* La flecha es del diseño y va `aria-hidden`: no aporta nada a quien no la ve, y
              anunciada suena a un carácter suelto después del texto del botón. */}
          <span aria-hidden>→</span>
        </a>
        <a
          href="#como-funciona"
          className="inline-flex items-center rounded-md border border-border bg-card px-6 py-3.5 text-[17px] font-semibold text-foreground transition-colors hover:bg-muted"
        >
          {labels.hero.how}
        </a>
      </div>

      {/*
        `min-w-0` + `max-w-full`: en un flex/grid el default `min-width: auto` deja que el PNG
        de 2632px dicte el ancho del hijo y rompa el layout en móvil. `sizes` evita que Next
        sirva el 2x completo a un teléfono.
      */}
      {/*
        El hueco entre el texto y el mockup, que es la pieza que hace entrar la portada en el
        pliegue (ver la cabecera — no el `min-h`).

        Va en un CONTENEDOR y no como margen de la tarjeta, y la diferencia no es cosmética:
        `mt-auto` reparte el espacio libre, así que cuando no sobra nada colapsa a cero y el
        mockup quedaría pegado a los botones. El `pt-12` de este envoltorio es el piso —48px
        pase lo que pase— y el `mt-auto` es lo que además lo empuja abajo cuando hay pantalla de
        sobra. Puestos los dos en la tarjeta, el `pt` caería DENTRO de su borde y pintaría una
        franja de fondo sobre la imagen.
      */}
      <div className="mt-auto min-w-0 pt-12">
        <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <Image
            src="/landing/mockup-resumen.png"
            alt={labels.hero.mockupAlt}
            width={1316}
            height={655}
            priority
            sizes="(max-width: 1170px) calc(100vw - 3rem), 1170px"
            className="h-auto w-full max-w-full"
          />
        </div>
      </div>
    </section>
  );
}
