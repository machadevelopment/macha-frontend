import Link from 'next/link';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { LandingNavMobile } from '@/components/landing/landing-nav-mobile';
import { MachaMark } from '@/components/ui/macha-mark';
import { mostrarEntradaEnLanding } from '@/lib/landing-flags';
import { ANCLA_DEMO } from '@/components/landing/demo-link';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * Barra de navegación de la landing.
 *
 * ═══ VA FIJA Y SEMITRANSPARENTE, QUE ES LO QUE FALTABA ═══
 *
 * En el diseño la barra mide 64px de alto y su fondo es blanco al 72 % — o sea que el contenido
 * se ve pasar por detrás. Eso solo tiene sentido si la barra está FIJA: un fondo translúcido
 * sobre una barra que se va con el scroll es un efecto que nadie llega a ver.
 *
 * Va `sticky` y no `fixed` a propósito: `fixed` la saca del flujo y hay que compensar el alto con
 * un relleno en el contenido, que es un número que se desincroniza en cuanto la barra cambia. Con
 * `sticky` el hueco lo reserva el propio elemento.
 *
 * El `supports-[backdrop-filter]` importa: sin desenfoque, un blanco al 72 % deja leer el texto
 * de abajo a través de los enlaces del nav. Donde el navegador no soporte `backdrop-filter`, el
 * fondo va OPACO — se pierde el efecto y se conserva la legibilidad, que es el orden correcto.
 *
 * ═══ EL WORDMARK DICE "MACHA FINANCE" ═══
 *
 * Antes decía solo "Macha". El diseño escribe el nombre completo en la barra y en el footer, y es
 * el único lugar de la landing donde la marca se presenta ante alguien que no la conoce: ahí no
 * se abrevia. Sigue sin ser una clave de i18n (design guide §7).
 *
 * ═══ EL "INICIAR SESIÓN" DEL DISEÑO ESTÁ DETRÁS DEL FLAG ═══
 *
 * El Figma trae dos acciones a la derecha: "Iniciar sesión" y "Solicitar demo". Keneth pidió el
 * login oculto por ahora, así que el primero sale por `mostrarEntradaEnLanding()` y queda el CTA
 * de demo, que es además el que el diseño trata como principal (el único con fondo oscuro).
 *
 * Ocultarlo no cierra la puerta: `/login` sigue vivo y entrar es escribirlo.
 *
 * ═══ LOS ENLACES DE SECCIÓN SON ANCLAS ═══
 *
 * Apuntan a secciones de ESTA página, no a rutas. La página declara cuáles existen y el nav
 * filtra por esa lista: un enlace de nav que no lleva a ninguna parte no falla en ningún test,
 * solo no hace nada al apretarlo, y de eso nadie se entera.
 *
 * "Inicio" no es ancla de sección sino el volver arriba, y "Contacto"/demo apuntan al formulario
 * (`#demo`).
 *
 * ═══ EN MÓVIL YA NO SE ESCONDEN (CU-868kv8m1v) ═══
 *
 * Este archivo decía antes que en móvil los enlaces se ocultan a propósito: son anclas de la
 * misma página, así que el scroll llega a todo, y un desplegable sería "un componente con estado,
 * foco y trampa de teclado para navegar a lo que ya está abajo".
 *
 * Jose reportó que en el teléfono no hay forma de saltar a una sección y el criterio de producto
 * cambió. El costo que aquel razonamiento identificaba sigue siendo real, así que se paga la parte
 * mínima: `LandingNavMobile` es un `<details>` nativo — el navegador pone abrir, cerrar, foco y
 * teclado — y el único JavaScript propio es cerrarlo al tocar un enlace.
 *
 * La lista de enlaces se arma UNA vez, acá, y se le pasa ya filtrada. Dos listas en dos archivos
 * se desincronizan en el primer cambio, y el síntoma sería un enlace que en móvil no lleva a
 * ninguna parte.
 */
export function LandingNav({
  locale,
  labels,
  common,
  /** Anclas de las secciones que YA existen en la página. */
  anclas = [],
}: {
  locale: Locale;
  labels: Dictionary['landing'];
  common: Dictionary['common'];
  anclas?: ('como-funciona' | 'planes' | 'faq' | 'demo')[];
}) {
  const secciones: { ancla: 'como-funciona' | 'planes' | 'faq'; texto: string }[] = [
    { ancla: 'como-funciona', texto: labels.nav.comoFunciona },
    { ancla: 'planes', texto: labels.nav.planes },
    { ancla: 'faq', texto: labels.nav.faq },
  ];

  /*
    La lista definitiva, ya filtrada por las anclas que la página declara. La consumen el menú de
    escritorio y el de móvil: es la ÚNICA fuente de los enlaces del nav.
  */
  const enlaces = [
    { href: '#inicio', texto: labels.nav.inicio },
    ...secciones
      .filter((e) => anclas.includes(e.ancla))
      .map((e) => ({ href: `#${e.ancla}`, texto: e.texto })),
    { href: ANCLA_DEMO, texto: labels.nav.contacto },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-glass backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-background">
      <div className="mx-auto flex h-16 max-w-[1170px] items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        {/*
          ═══ POR DEBAJO DE `sm` QUEDA SOLO EL ISOTIPO, Y NO ES UNA PREFERENCIA ═══

          El lockup completo mide 134px. Con el selector de idioma (57), el CTA (125), el nuevo
          disparador del menú (36), los huecos y el relleno, la fila pedía 424px de los 375 de un
          teléfono chico: la barra DESBORDABA, y como la raíz de la página recorta el eje
          horizontal, desbordaba en silencio — el CTA se salía de la pantalla sin que nada fallara.

          De lo que hay en la fila, el nombre escrito es lo único que tiene un sustituto que dice
          lo mismo: el isotipo ES la marca. Esconder el CTA lo dejaría fuera de alcance justo donde
          más se usa, y esconder el menú deshace este ticket.

          Esto no contradice la nota de arriba —"el nombre completo no se abrevia"—: no se abrevia
          en ninguna parte donde entre. Debajo de 640px no entra.
        */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5 font-ui text-[17px] font-bold tracking-[-0.03em] text-foreground"
        >
          <MachaMark />
          <span className="hidden sm:inline">Macha Finance</span>
        </Link>

        {/*
          En escritorio los enlaces van en fila; por debajo de `md` los sirve `LandingNavMobile`
          con los mismos datos. Los dos leen `enlaces`.
        */}
        <nav className="hidden items-center gap-7 md:flex">
          {enlaces.map((e) => (
            <a
              key={e.href}
              href={e.href}
              className="text-[15px] font-light text-muted-foreground transition-colors hover:text-foreground"
            >
              {e.texto}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <LocaleSwitcher locale={locale} />

          {mostrarEntradaEnLanding() && (
            <a
              href="/login"
              className="hidden text-[13px] font-semibold text-foreground transition-opacity hover:opacity-70 md:block"
            >
              {common.signIn}
            </a>
          )}

          {/*
            El CTA va FUERA del menú y antes que él: es la acción principal del diseño y tiene que
            estar siempre visible en móvil, abierto o cerrado el desplegable.
          */}
          <a
            href={ANCLA_DEMO}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {labels.nav.demo}
          </a>

          <LandingNavMobile enlaces={enlaces} etiqueta={labels.nav.menu} />
        </div>
      </div>
    </header>
  );
}
