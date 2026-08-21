import { InsightPoint } from '@/components/ui/insight-point';
import { enlaceDemo } from '@/components/landing/demo-link';
import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * El cierre de la landing: la última oportunidad de convertir.
 *
 * Titular en `sectionbig` (68px, no 52px como el resto de las secciones) porque el diseño lo
 * trata igual que el hero: es el otro extremo de la página y tiene que pesar lo mismo. Alguien
 * que llegó hasta acá leyó todo; el remate no puede ser más chico que lo que ya leyó.
 *
 * Centrado, a diferencia de las secciones de contenido que van alineadas a la izquierda. No es
 * inconsistencia: una sección que explica se lee en columna, y un remate de una línea con un
 * botón se lee como una portada.
 */
export function LandingCta({ labels }: { labels: Dictionary['landing'] }) {
  return (
    <div className="relative flex flex-col items-center gap-6 text-center">
      {/*
        La mancha de marca ARRIBA Y AL CENTRO, como en el diseño: es el cierre de la página y el
        salvia vuelve a aparecer donde apareció en el hero, cerrando el paréntesis. Acá corresponde
        porque no hay un solo dato en pantalla — un titular, una línea y un botón.
      */}
      <InsightPoint
        variant="ambient"
        className="-top-52 left-1/2 h-[420px] w-[420px] -translate-x-1/2"
      />
      <h2 className="relative max-w-[24ch] text-sectionbig text-foreground">{labels.cta.title}</h2>
      <p className="relative max-w-[52ch] text-lhero text-muted-foreground">
        {labels.cta.subtitle}
      </p>
      <a
        href={enlaceDemo(labels.demoAsunto)}
        className="relative mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3.5 text-[17px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        {labels.cta.demo}
        <span aria-hidden>→</span>
      </a>
    </div>
  );
}
