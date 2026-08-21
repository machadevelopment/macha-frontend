import Link from 'next/link';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { MachaMark } from '@/components/ui/macha-mark';
import { mostrarEntradaEnLanding } from '@/lib/landing-flags';
import { enlaceDemo } from '@/components/landing/demo-link';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * Barra de navegación de la landing.
 *
 * ═══ EL "INICIAR SESIÓN" DEL DISEÑO ESTÁ DETRÁS DEL FLAG ═══
 *
 * El Figma trae el nav con dos acciones a la derecha: "Iniciar sesión" y "Solicitar demo". Keneth
 * pidió el login oculto por ahora, así que el primero sale por `mostrarEntradaEnLanding()` y el
 * CTA de demo queda solo — que es además lo que el propio diseño trata como acción principal (es
 * el único de los dos con fondo negro).
 *
 * Ocultarlo no cierra la puerta: `/login` sigue vivo y entrar es escribirlo.
 *
 * ═══ LOS ENLACES DE SECCIÓN SON ANCLAS ═══
 *
 * `#como-funciona`, `#planes`, `#faq` apuntan a secciones de ESTA página, no a rutas. La página
 * declara cuáles existen y el nav filtra por esa lista: un enlace de nav que no lleva a ninguna
 * parte no falla en ningún test, solo no hace nada al apretarlo, y de eso nadie se entera.
 *
 * "Contacto" no es ancla: es el mismo `mailto` del CTA. No hay sección de contacto en el diseño
 * y no la voy a inventar — lo que el nav promete es escribirle a alguien, y eso es lo que hace.
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
  anclas?: ('como-funciona' | 'planes' | 'faq')[];
}) {
  const enlaces: { ancla: 'como-funciona' | 'planes' | 'faq'; texto: string }[] = [
    { ancla: 'como-funciona', texto: labels.nav.comoFunciona },
    { ancla: 'planes', texto: labels.nav.planes },
    { ancla: 'faq', texto: labels.nav.faq },
  ];

  return (
    <header className="flex items-center justify-between gap-4">
      {/* El wordmark es la marca, no una clave de i18n (design guide §7). */}
      <Link
        href="/"
        className="flex shrink-0 items-center gap-1.5 font-ui text-[17px] font-bold tracking-[-0.03em] text-foreground"
      >
        <MachaMark />
        Macha
      </Link>

      {/*
        El menú se esconde en pantallas chicas en vez de convertirse en un menú hamburguesa.
        Es deliberado para esta entrega: los enlaces son anclas de la MISMA página, así que en
        móvil el usuario llega a todo haciendo scroll. Un menú desplegable acá sería un
        componente con estado, foco y trampa de teclado para navegar a lo que ya está abajo.
      */}
      <nav className="hidden items-center gap-7 app:flex">
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
          href={enlaceDemo(labels.demoAsunto)}
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
            className="hidden text-[13px] font-semibold text-foreground transition-opacity hover:opacity-70 app:block"
          >
            {common.signIn}
          </a>
        )}

        <a
          href={enlaceDemo(labels.demoAsunto)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {labels.nav.demo}
        </a>
      </div>
    </header>
  );
}
