import Link from 'next/link';
import { LocaleSwitcher } from '@/components/locale-switcher';
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
  const enlaces: { ancla: 'como-funciona' | 'planes' | 'faq'; texto: string }[] = [
    { ancla: 'como-funciona', texto: labels.nav.comoFunciona },
    { ancla: 'planes', texto: labels.nav.planes },
    { ancla: 'faq', texto: labels.nav.faq },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-canvas/[0.72] backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-canvas">
      <div className="mx-auto flex h-16 max-w-[1170px] items-center justify-between gap-4 px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5 font-ui text-[17px] font-bold tracking-[-0.03em] text-foreground"
        >
          <MachaMark />
          Macha Finance
        </Link>

        {/*
          El menú se esconde en pantallas chicas en vez de convertirse en un menú hamburguesa.
          Es deliberado: los enlaces son anclas de la MISMA página, así que en móvil el usuario
          llega a todo haciendo scroll. Un desplegable acá sería un componente con estado, foco y
          trampa de teclado para navegar a lo que ya está abajo.
        */}
        <nav className="hidden items-center gap-7 md:flex">
          <a
            href="#inicio"
            className="text-[15px] font-light text-muted-foreground transition-colors hover:text-foreground"
          >
            {labels.nav.inicio}
          </a>
          {enlaces
            .filter((e) => anclas.includes(e.ancla))
            .map((e) => (
              <a
                key={e.ancla}
                href={`#${e.ancla}`}
                className="text-[15px] font-light text-muted-foreground transition-colors hover:text-foreground"
              >
                {e.texto}
              </a>
            ))}
          <a
            href={ANCLA_DEMO}
            className="text-[15px] font-light text-muted-foreground transition-colors hover:text-foreground"
          >
            {labels.nav.contacto}
          </a>
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <LocaleSwitcher locale={locale} />

          {mostrarEntradaEnLanding() && (
            <a
              href="/login"
              className="hidden text-[13px] font-semibold text-foreground transition-opacity hover:opacity-70 md:block"
            >
              {common.signIn}
            </a>
          )}

          <a
            href={ANCLA_DEMO}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {labels.nav.demo}
          </a>
        </div>
      </div>
    </header>
  );
}
