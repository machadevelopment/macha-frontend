'use client';

import { Menu, X } from 'lucide-react';

/**
 * El menú de secciones en móvil (CU-868kv8m1v).
 *
 * ═══ POR QUÉ EXISTE, SI EL COMENTARIO DE AL LADO DECÍA QUE NO DEBÍA ═══
 *
 * `landing-nav.tsx` documentaba lo contrario: los enlaces son anclas de la MISMA página, así que
 * en móvil se llega a todo haciendo scroll, y un desplegable ahí sería "un componente con estado,
 * foco y trampa de teclado para navegar a lo que ya está abajo".
 *
 * Jose reportó que en móvil no hay forma de saltar a una sección, y con eso el criterio de
 * producto cambió. Lo que NO cambió es el costo que aquel comentario identificaba — así que se
 * paga la parte mínima.
 *
 * ═══ `<details>` Y NO `useState` ═══
 *
 * Abrir, cerrar, el foco, Enter/Espacio y el rol de disclosure los resuelve el navegador. Un
 * desplegable a mano en React vuelve a implementar eso mismo, peor: hay que acordarse de cerrar
 * con Escape, de devolver el foco al disparador y de no atrapar el tabulado dentro del panel.
 *
 * El ÚNICO JavaScript propio es cerrar al tocar un enlace, y ni siquiera es estado de React: se
 * le quita el atributo `open` al `<details>`, que es quien de verdad lo tiene. Sin eso el panel
 * queda abierto tapando justo la sección a la que se acaba de saltar.
 *
 * Es cliente por esa línea. Vive en su propio archivo para que `landing-nav.tsx` —y con él el
 * resto de la barra— siga siendo servidor.
 *
 * ═══ LOS ENLACES LLEGAN YA ARMADOS ═══
 *
 * No se rearman acá: los recibe de `LandingNav`, que es quien filtra por las anclas que la página
 * declara. Dos listas de enlaces en dos archivos se desincronizan en el primer cambio, y el
 * síntoma sería un enlace que en móvil no lleva a ninguna parte — que no falla en ningún test,
 * solo no hace nada al apretarlo.
 */
export function LandingNavMobile({
  enlaces,
  etiqueta,
}: {
  enlaces: { href: string; texto: string }[];
  /** Nombre accesible del disparador: el ícono solo no dice nada a un lector de pantalla. */
  etiqueta: string;
}) {
  return (
    <details className="group relative md:hidden">
      <summary
        aria-label={etiqueta}
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden"
      >
        <Menu aria-hidden className="h-5 w-5 group-open:hidden" />
        <X aria-hidden className="hidden h-5 w-5 group-open:block" />
      </summary>

      {/*
        Ancla al borde derecho de la barra y no al del disparador: pegado al disparador, un
        "Cómo funciona" se sale de la pantalla por la derecha en un teléfono angosto.

        `bg-canvas` OPACO a propósito, aunque la barra sea translúcida: acá pasa texto por
        detrás, y el efecto que en una barra de 64px es diseño, en un panel de cuatro enlaces
        es un menú ilegible.
      */}
      <nav
        aria-label={etiqueta}
        className="absolute right-0 top-[calc(100%+0.75rem)] z-50 flex min-w-[180px] flex-col rounded-md border border-border bg-background py-2 shadow-lg"
      >
        {enlaces.map((e) => (
          <a
            key={e.href}
            href={e.href}
            onClick={(ev) => ev.currentTarget.closest('details')?.removeAttribute('open')}
            className="px-4 py-2.5 text-[15px] font-light text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {e.texto}
          </a>
        ))}
      </nav>
    </details>
  );
}
