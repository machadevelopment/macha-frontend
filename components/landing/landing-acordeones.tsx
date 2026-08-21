'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { InsightPoint } from '@/components/ui/insight-point';
import type { Dictionary } from '@/lib/i18n/dictionary';

type L = Dictionary['landing'];

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * LOS DOS ACORDEONES DE LA LANDING
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Son los ÚNICOS componentes de cliente de la página, y por eso viven aparte: el resto de la
 * landing es estática y se prerenderiza. Mezclarlos en el mismo archivo que las secciones
 * estáticas arrastraría `'use client'` a toda la página.
 *
 * ═══ DE DÓNDE SALIÓ SU CONTENIDO ═══
 *
 * El Figma trae 16 frames del mismo diseño, y cada uno tiene un item DISTINTO abierto. En la
 * primera pasada los tomé por copias con ruido y usé uno solo — mal: las diferencias de 1 a 24
 * líneas que descarté eran precisamente el contenido del item expandido.
 *
 * Los 16 juntos son la especificación completa: cruzando sus estados salen los 5 items del
 * acordeón de capacidades con sus dos insights cada uno, y las 6 preguntas del FAQ con su
 * respuesta. Sin cruzarlos, cada acordeón tendría un item con contenido y el resto vacío.
 *
 * ═══ ACCESIBILIDAD: BOTÓN, NO DIV ═══
 *
 * El disparador es un `<button>` con `aria-expanded` y `aria-controls`, y el panel un `<div>` con
 * `role="region"`. Un acordeón hecho con `div` + `onClick` no se puede abrir con teclado, y en una
 * landing eso esconde la mitad del argumento de venta a quien navega sin ratón.
 */

/**
 * "Cinco formas de entender tu negocio."
 *
 * Un item abierto a la vez, y siempre HAY uno abierto: no hay estado "todo cerrado". Es lo que
 * hace el diseño y tiene sentido acá — el panel de la derecha es la mitad de la sección, y
 * dejarlo vacío deja un hueco enorme en la página.
 */
export function SeccionCapacidades({ labels }: { labels: L }) {
  const t = labels.capacidades;
  const [abierto, setAbierto] = useState(0);
  const activo = t.items[abierto] ?? t.items[0]!;

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-4">
        <p className="font-mono text-eyebrow uppercase tracking-[0.08em] text-faint">{t.eyebrow}</p>
        <h2 className="max-w-[20ch] text-section text-foreground">{t.title}</h2>
      </div>

      <div className="grid grid-cols-1 gap-8 app:grid-cols-[1fr_1.05fr] app:gap-12">
        {/* La lista numerada. */}
        <ul className="flex flex-col">
          {t.items.map((item, i) => {
            const esteAbierto = i === abierto;
            return (
              <li key={item.titulo} className="border-t border-border last:border-b">
                <button
                  type="button"
                  onClick={() => setAbierto(i)}
                  aria-expanded={esteAbierto}
                  aria-controls={`capacidad-${i}`}
                  className="flex w-full items-baseline gap-4 py-5 text-left"
                >
                  <span className="font-mono text-body text-faint">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {/*
                    El item cerrado va en tinta apagada y el abierto en plena. Es la única señal
                    de estado y alcanza: el peso no cambia, así que la lista no “salta” al abrir
                    otro item — que es lo que pasa cuando el activo se pone en negrita.
                  */}
                  <span
                    className={cn(
                      'text-[22px] font-normal leading-tight tracking-[-0.02em] transition-colors',
                      esteAbierto ? 'text-foreground' : 'text-faint',
                    )}
                  >
                    {item.titulo}
                  </span>
                </button>

                {esteAbierto && (
                  <p id={`capacidad-${i}`} className="pb-6 pl-10 text-body text-muted-foreground">
                    {item.desc}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        {/*
          El panel de insights del item activo. `aria-live="polite"` porque su contenido cambia
          al apretar un botón de la izquierda: sin eso, quien usa lector de pantalla aprieta y no
          se entera de que algo cambió al otro lado de la pantalla.
        */}
        <div
          aria-live="polite"
          className="self-start rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <ul className="flex flex-col">
            {activo.insights.map((ins) => (
              <li
                key={ins.titulo}
                className="flex gap-3 border-t border-border py-5 first:border-t-0 first:pt-0 last:pb-0"
              >
                <InsightPoint size="sm" className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex min-w-0 flex-col gap-1.5">
                  <p className="text-body font-semibold text-foreground">{ins.titulo}</p>
                  <p className="text-micro text-muted-foreground">{ins.desc}</p>
                  <p className="text-micro text-faint">{ins.meta}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * "Antes de la demo." — el FAQ.
 *
 * A diferencia del acordeón de capacidades, acá SÍ se puede cerrar todo: son preguntas
 * independientes y forzar una abierta obligaría a elegir cuál importa más. Arranca con la primera
 * abierta, que es lo que hace el diseño.
 *
 * El indicador es `–` / `+` como en el Figma, y va `aria-hidden`: el estado ya lo anuncia
 * `aria-expanded`, y un lector de pantalla leyendo "más" o "menos" después de la pregunta suena a
 * ruido.
 */
export function SeccionFaq({ labels }: { labels: L }) {
  const t = labels.faq;
  const [abierta, setAbierta] = useState<number | null>(0);

  return (
    <div className="grid grid-cols-1 gap-10 app:grid-cols-[1fr_1.4fr] app:gap-16">
      <div className="flex flex-col gap-4">
        <p className="font-mono text-eyebrow uppercase tracking-[0.08em] text-faint">{t.eyebrow}</p>
        <h2 className="text-section text-foreground">{t.title}</h2>
      </div>

      <ul className="flex flex-col">
        {t.items.map((item, i) => {
          const esta = i === abierta;
          return (
            <li key={item.q} className="border-t border-border last:border-b">
              <button
                type="button"
                onClick={() => setAbierta(esta ? null : i)}
                aria-expanded={esta}
                aria-controls={`faq-${i}`}
                className="flex w-full items-baseline justify-between gap-6 py-5 text-left"
              >
                <span className="text-[21px] font-normal leading-snug tracking-[-0.02em] text-foreground">
                  {item.q}
                </span>
                <span aria-hidden className="shrink-0 text-lead text-faint">
                  {esta ? '–' : '+'}
                </span>
              </button>

              {esta && (
                <p id={`faq-${i}`} className="max-w-[70ch] pb-6 text-body text-muted-foreground">
                  {item.a}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
