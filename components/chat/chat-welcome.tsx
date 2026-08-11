'use client';

import { Sparkles } from 'lucide-react';
import { InsightPoint } from '@/components/ui/insight-point';
import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * Estado vacío del asesor (CU-868knx189).
 *
 * ANTES el chat vacío mostraba una sola línea gris —"Escribe un mensaje para empezar"—
 * en la esquina de una tarjeta de 560px de alto. Técnicamente correcto y completamente
 * inútil: al dueño de una PYME que abre el asesor por primera vez no se le ocurre qué
 * preguntarle a un modelo sobre su propia contabilidad, y una caja de texto en blanco no
 * se lo sugiere. Las cuatro preguntas son el onboarding de la pantalla.
 *
 * LAS TARJETAS ENVÍAN, no rellenan el input. Es la diferencia entre "acá tienes un
 * ejemplo, ahora escríbelo" y una respuesta en pantalla: rellenar el input deja al
 * usuario frente al mismo trabajo que estaba evitando, con un paso extra.
 *
 * Las cuatro preguntas cubren los cuatro ejes que el asesor sabe consultar con sus
 * herramientas —caja, margen por producto, gasto y cobros vencidos— para que ninguna
 * caiga en "no tengo esos datos". Viven en el diccionario, no en el JSX.
 */
export function ChatWelcome({
  labels,
  onAsk,
  disabled,
}: {
  labels: Dictionary['chat']['welcome'];
  onAsk: (question: string) => void;
  disabled: boolean;
}) {
  const preguntas = [labels.q1, labels.q2, labels.q3, labels.q4];

  return (
    // `my-auto` centra el bloque en la altura de la tarjeta sin volverla flex-center:
    // en cuanto llega el primer mensaje, este componente desaparece y la conversación
    // tiene que quedar arriba, no centrada.
    <div className="my-auto flex flex-col items-center gap-4 px-2 py-6 text-center">
      {/* CU-868knx0vh: el destello pasa a vivir dentro del Insight Point. Esta pantalla
          es la presentación del asesor —identidad pura, ningún dato— así que es
          exactamente el caso para el verde de marca. */}
      <InsightPoint size="lg">
        <Sparkles className="h-6 w-6" strokeWidth={1.6} />
      </InsightPoint>

      <div className="flex flex-col gap-1">
        <p className="text-cardh2">{labels.title}</p>
        <p className="max-w-[52ch] text-body text-muted-foreground">{labels.subtitle}</p>
      </div>

      <p className="font-mono text-eyebrow uppercase text-faint">{labels.quickLabel}</p>

      {/*
        Apiladas en móvil, dos columnas desde `sm`. No se usa el breakpoint `app` (1080px):
        el chat vive dentro de una columna que ya es angosta, y a 640px dos tarjetas de
        pregunta entran cómodas.
      */}
      <div className="grid w-full max-w-[560px] grid-cols-1 gap-2 sm:grid-cols-2">
        {preguntas.map((pregunta) => (
          <button
            key={pregunta}
            type="button"
            onClick={() => onAsk(pregunta)}
            disabled={disabled}
            // Sin modificador de opacidad (`border-foreground/20`): los colores del tema
            // son `var(--…)` con hex adentro, y Tailwind no puede componer alfa sobre eso
            // sin `<alpha-value>` en la config — saldría un borde sin cambio o roto.
            className="rounded-md border border-border bg-card px-3 py-2.5 text-left text-body text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pregunta}
          </button>
        ))}
      </div>
    </div>
  );
}
