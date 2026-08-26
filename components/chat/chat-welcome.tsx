'use client';

import { FileWarning, Receipt, TrendingUp, Wallet } from 'lucide-react';
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
  escuchando = false,
}: {
  labels: Dictionary['chat']['welcome'];
  onAsk: (question: string) => void;
  disabled: boolean;
  /**
   * El usuario ya escribió algo, aunque todavía no lo haya mandado.
   *
   * Viene del padre porque es quien tiene el borrador. Vale la pena que el sello reaccione
   * ANTES del envío: es lo que hace que el asesor se sienta atento en vez de un logo que
   * despierta cuando ya es tarde.
   */
  escuchando?: boolean;
}) {
  /*
    ═══ CADA PREGUNTA LLEVA SU ÍCONO (reporte de Jose, mismo día) ═══

    *"que las palabras puedan también tener o las preguntas base puedan tener esos iconitos"*.

    El ícono NO es decoración: dice de qué habla la pregunta antes de leerla —caja, margen,
    gasto, cobro— y es lo que convierte cuatro frases apiladas en cuatro atajos distinguibles.
    Va emparejado con su pregunta acá y no en el diccionario: el diccionario tiene los TEXTOS, y
    un ícono no se traduce.

    Los cuatro salen de `lucide-react`, que ya es dependencia. Van en un cuadradito de marca
    (`--brand-soft` con tinta `--brand-ink`), que es la misma pieza del mockup que Jose validó.
  */
  const preguntas = [
    { texto: labels.q1, Icono: Wallet },
    { texto: labels.q2, Icono: TrendingUp },
    { texto: labels.q3, Icono: Receipt },
    { texto: labels.q4, Icono: FileWarning },
  ];

  return (
    /*
      `my-auto` centra el bloque en la altura de la tarjeta sin volverla flex-center: en cuanto
      llega el primer mensaje, este componente desaparece y la conversación tiene que quedar
      arriba, no centrada.

      `gap-5` y `py-10` (antes `gap-4` y `py-6`) por el otro pedido de Jose: *"que pueda ser un
      poquito más centrado el chat"*. Con el círculo pegado al borde superior de su caja, el
      bloque se leía apoyado arriba y no centrado — el aire de abajo hace el trabajo que el
      `my-auto` solo no puede hacer cuando el contenido es corto.
    */
    <div className="my-auto flex flex-col items-center gap-5 px-2 py-10 text-center">
      {/*
        ═══ EL CÍRCULO VA SOLO, SIN ÍCONO ADENTRO (reporte de Jose, 2026-08-26) ═══

        Llevaba un `Sparkles` dentro. Jose: *"en vez de ese iconito de la estrellita, utilizar
        ese circulito"* — el elemento que hay que animar es el que ya identifica a Macha, no un
        ícono genérico de IA puesto encima.

        Y hay una razón que va más allá del gusto, que él nombró: *"es como para volverlo un
        poco menos AI"*. Una estrellita de destello es el cliché visual de "esto lo hizo una
        IA"; el Insight Point es la marca. Tapar la marca con el cliché era exactamente al
        revés de lo que el rediseño buscaba.

        `xl` y no `lg`: sin ícono adentro, el círculo ES la figura, así que se le da el tamaño
        de una figura. A `lg` (56px) quedaba como un punto perdido en el centro de la pantalla.
      */}
      <InsightPoint size="xl" state={escuchando ? 'listening' : 'idle'} />

      <div className="flex flex-col gap-1">
        <p className="text-cardh2">{labels.title}</p>
        <p className="max-w-[52ch] text-body text-muted-foreground">{labels.subtitle}</p>
      </div>

      {/* El rótulo acompaña al estado del sello: mientras hay algo escrito, "Escuchando…"
          explica lo que el círculo está haciendo. Sin eso, la animación es decoración. */}
      <p className="font-mono text-eyebrow uppercase text-faint">
        {escuchando ? labels.listeningLabel : labels.quickLabel}
      </p>

      {/*
        Apiladas en móvil, dos columnas desde `sm`. No se usa el breakpoint `app` (1080px):
        el chat vive dentro de una columna que ya es angosta, y a 640px dos tarjetas de
        pregunta entran cómodas.
      */}
      <div className="grid w-full max-w-[560px] grid-cols-1 gap-2 sm:grid-cols-2">
        {preguntas.map(({ texto, Icono }) => (
          <button
            key={texto}
            type="button"
            onClick={() => onAsk(texto)}
            disabled={disabled}
            // Sin modificador de opacidad (`border-foreground/20`): los colores del tema
            // son `var(--…)` con hex adentro, y Tailwind no puede componer alfa sobre eso
            // sin `<alpha-value>` en la config — saldría un borde sin cambio o roto.
            className="flex items-start gap-2.5 rounded-md border border-border bg-card px-3 py-2.5 text-left text-body text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {/* `aria-hidden`: el texto de la pregunta ya dice todo. El ícono es un ancla
                visual, y anunciarlo sería leerle al usuario un adorno. */}
            <span
              aria-hidden
              // `rounded-md` (8px) y no el `7px` del mockup: los radios salen de la escala del
              // sistema y hay test que lo fija. Un píxel de diferencia no lo ve nadie; un radio
              // suelto sí se acumula hasta que las esquinas del producto dejan de coincidir.
              className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--brand-soft)] text-[var(--brand-ink)]"
            >
              <Icono className="h-3.5 w-3.5" strokeWidth={1.8} />
            </span>
            <span className="min-w-0">{texto}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
