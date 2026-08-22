'use client';

import { useRef, useState } from 'react';
import { InsightPoint } from '@/components/ui/insight-point';
import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * "Tu negocio tiene preguntas. Macha tiene contexto." — el asesor con IA.
 *
 * ═══ ME EQUIVOQUÉ DOS VECES CON ESTA SECCIÓN ═══
 *
 * (1) La construí con las tres preguntas visibles a la vez, razonando que "un carrusel esconde
 * dos tercios del argumento". El diseño no es un carrusel: son tres CHIPS y un panel con la
 * respuesta a la que esté activa. Y la elección no es cosmética — es una de las tres cosas que
 * varían entre los 16 frames del Figma (junto con capacidades y el FAQ), o sea que los frames
 * están justamente especificando este estado. Mostrar las tres respuestas apiladas convertía en
 * un muro de texto lo que el diseño hizo para que se leyera una a la vez.
 *
 * (2) Y la pinté como una tarjeta oscura con esquinas redondeadas dentro de la página. En el
 * diseño la sección oscura ocupa TODO el ancho de la ventana (medido: `#191919`, 966px de alto,
 * de borde a borde). Eso ahora lo hace `<Banda tono="tinta">`; acá adentro no hay ni un color.
 *
 * ═══ ES UN TABLIST DE VERDAD, CON FLECHAS ═══
 *
 * Tres botones que cambian un panel es exactamente el patrón de pestañas, así que lleva
 * `role="tablist"`, `aria-selected` y `aria-controls`. Y lleva las FLECHAS del teclado, no solo
 * el foco tabulable: media implementación es peor que ninguna, porque el lector de pantalla
 * anuncia "pestaña 1 de 3" —le dice al usuario que use las flechas— y entonces las flechas tienen
 * que funcionar. Con `tabIndex` rotativo, que es lo que hace que Tab salte al panel en vez de
 * recorrer las tres pestañas.
 */
export function SeccionAsesor({ labels }: { labels: Dictionary['landing'] }) {
  const t = labels.asesor;
  const [activa, setActiva] = useState(0);
  const chips = useRef<(HTMLButtonElement | null)[]>([]);
  const actual = t.preguntas[activa] ?? t.preguntas[0]!;

  function mover(delta: number) {
    const i = (activa + delta + t.preguntas.length) % t.preguntas.length;
    setActiva(i);
    // El foco tiene que SEGUIR a la selección: si se queda atrás, la siguiente flecha se mueve
    // desde donde estaba el foco y el recorrido se vuelve impredecible.
    chips.current[i]?.focus();
  }

  return (
    <div className="relative">
      {/* El punto de marca como atmósfera, abajo a la izquierda como en el diseño. Acá el salvia
          corresponde: no hay un solo dato en pantalla, son preguntas y respuestas en prosa. */}
      <InsightPoint
        variant="ambient"
        className="-bottom-40 -left-48 h-[460px] w-[460px] opacity-70"
      />

      <div className="relative flex flex-col gap-4">
        <p className="text-leyebrow uppercase text-muted-foreground">{t.eyebrow}</p>
        <h2 className="max-w-[18ch] text-sectionbig text-foreground">{t.title}</h2>
        <p className="mt-2 max-w-[56ch] text-lsub text-muted-foreground">{t.subtitle}</p>
      </div>

      <div
        role="tablist"
        aria-label={t.title}
        className="relative mt-10 flex max-w-full flex-col gap-2.5 sm:flex-row sm:flex-wrap"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            mover(1);
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            mover(-1);
          }
        }}
      >
        {t.preguntas.map((p, i) => {
          const esta = i === activa;
          return (
            <button
              key={p.q}
              ref={(el) => {
                chips.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`asesor-chip-${i}`}
              aria-selected={esta}
              aria-controls="asesor-panel"
              tabIndex={esta ? 0 : -1}
              onClick={() => setActiva(i)}
              className={`rounded-pill border px-4 py-2 text-left text-lprose transition-colors ${
                esta
                  ? 'border-border-strong bg-muted text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.q}
            </button>
          );
        })}
      </div>

      {/*
        UN solo panel para las tres pestañas, y por eso `aria-controls` de todas apunta acá y el
        panel se re-anuncia al cambiar. La alternativa canónica —tres paneles y dos escondidos—
        triplicaría el texto en el DOM para que un buscador indexe respuestas que no se ven.
      */}
      <div
        id="asesor-panel"
        role="tabpanel"
        aria-labelledby={`asesor-chip-${activa}`}
        tabIndex={0}
        className="relative mt-6 max-w-[62ch] rounded-xl border border-border p-6"
      >
        <p className="text-lline font-light text-muted-foreground">{actual.q}</p>
        <div className="mt-5 flex gap-3">
          <InsightPoint size="sm" className="mt-1.5 h-2.5 w-2.5 shrink-0" />
          <p className="text-lanswer text-foreground">{actual.a}</p>
        </div>
      </div>
    </div>
  );
}
