'use client';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InsightPoint } from '@/components/ui/insight-point';
import { requestJson } from '@/lib/api/browser';
import { formatNumber } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type {
  InsightCategory,
  InsightResponse,
  InsightSeverity,
  InsufficientCreditsResponse,
} from '@/lib/api/dashboard';

// CU-868kfvabk: the hard block (criterio 3) is enforced server-side (POST
// /insights) — this component only reflects whatever the backend decides, it
// never estimates or bypasses the check itself.

/**
 * CU-868kkgav2: el motivo del fallo, ya no aplastado en un solo estado.
 *
 * Antes todo caía en `{ status: 'error' }` y la pantalla decía "saldo de créditos
 * insuficiente" con un enlace a comprar — daba igual que fuera un 500, un 429 o un corte
 * de red. Mandaba a pagar por un problema ajeno, y de paso escondía las caídas reales:
 * un backend muerto se veía en el dashboard como "compra más créditos".
 */
type Failure =
  | { kind: 'insufficient'; required: number; balance: number }
  | { kind: 'rateLimited' }
  | { kind: 'failed'; detail?: string };

export function InsightPanel({
  locale,
  labels,
  topUpLabel,
  onCreditsUpdated,
}: {
  locale: Locale;
  labels: Dictionary['dashboard'];
  topUpLabel: string;
  onCreditsUpdated: (balance: number) => void;
}) {
  const [state, setState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error'; failure: Failure }
    | { status: 'done'; insights: InsightResponse['insights']; narrative: string }
  >({ status: 'idle' });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════════════
   * EL SELLO REFLEJA EL MISMO ESTADO QUE YA GOBIERNA EL BOTÓN
   * ═══════════════════════════════════════════════════════════════════════════════════════
   *
   * ⚠️ `state` (arriba) y el prop `state` del `InsightPoint` son DOS COSAS DISTINTAS con el
   * mismo nombre: el de arriba es la máquina de este panel (`idle | loading | error | done`) y
   * el del componente es qué está haciendo el sello (`idle | listening | thinking | speaking`).
   * Se mapean a propósito, no se pasan de largo.
   *
   *   · `loading` → `thinking`  (mientras el botón está deshabilitado)
   *   · `done`    → `speaking`, pero solo un rato: ver `acabaDeContestar`
   *   · `error`   → sin animación. Inventarle un estado de error al sello sería decorar un
   *     fallo; lo que el usuario necesita ahí es el mensaje, que ya está.
   *
   * ═══ POR QUÉ `speaking` NO SE QUEDA ═══
   *
   * Este panel vive en el rail del Dashboard y se queda MONTADO toda la sesión. Dejar el
   * ecualizador animando después de generar el consejo sería una animación corriendo para
   * siempre en una pantalla que el usuario deja abierta — el mismo cuidado que el hilo del
   * chat, por el mismo motivo.
   */
  const [acabaDeContestar, setAcabaDeContestar] = useState(false);

  useEffect(() => {
    if (state.status !== 'done') return;
    setAcabaDeContestar(true);
    const t = setTimeout(() => setAcabaDeContestar(false), 2000);
    return () => clearTimeout(t);
  }, [state.status]);

  const selloState =
    state.status === 'loading'
      ? ('thinking' as const)
      : state.status === 'done'
        ? acabaDeContestar
          ? ('speaking' as const)
          : ('idle' as const)
        : state.status === 'idle'
          ? ('idle' as const)
          : undefined;

  async function generate() {
    setState({ status: 'loading' });

    /*
     * ═══ TECHO DE ESPERA: EL BOTÓN NO SE PUEDE QUEDAR EN "GENERANDO…" ═══
     *
     * CU-868kx4a02. Jose reportó que el Consejo Financiero Diario "no sirve", y su captura
     * muestra exactamente qué: el panel clavado en **"Generating…"**, con el botón
     * deshabilitado y ningún resultado.
     *
     * Lo que NO era: la generación funciona y es específica. Medido en producción —10 consejos
     * pedidos ese mismo día, los 10 con resultado guardado, con cifras reales de la empresa
     * ("los ingresos crecieron de Q4.965.310 en junio a Q7.014.710 en agosto")—. O sea que el
     * backend contestó y la pantalla no se enteró.
     *
     * Lo que sí: **no había techo de espera.** El comentario de abajo ya contaba una versión
     * anterior de este mismo síntoma (un 502 con cuerpo HTML que hacía lanzar a `res.json()`) y
     * lo arregló para el caso en que la petición TERMINA mal. Queda el caso en que no termina:
     * si la conexión se queda abierta sin responder —el contenedor muere con la petición en
     * vuelo, que es justo lo que pasaba ese día con el bucle de crash del backend— `fetch` no
     * rechaza nunca y este `await` no vuelve. El estado queda en `loading` para siempre y la
     * única salida es recargar la página.
     *
     * 90 s y no menos: un consejo llama al modelo con el snapshot de métricas de la empresa y
     * tarda decenas de segundos de forma legítima. El techo está para el caso en que no hay
     * nadie del otro lado, no para apurar al modelo.
     *
     * Al vencer se cae a `failed`, que es el estado que YA ofrece reintentar. No hace falta un
     * mensaje nuevo: para el usuario "no contestó" y "falló" se resuelven igual, apretando otra
     * vez, y un motivo más en la pantalla sería precisión que no cambia lo que hay que hacer.
     */
    const corte = new AbortController();
    const reloj = setTimeout(() => corte.abort(), 90_000);

    // `requestJson` no lanza. Antes un 502 con cuerpo HTML hacía que `res.json()`
    // lanzara dentro de `generate()`, sin `catch`: el botón se quedaba en "generando…"
    // para siempre y no había forma de reintentar sin recargar.
    const result = await requestJson<InsightResponse>(
      '/api/insights',
      'POST',
      undefined,
      corte.signal,
    );
    clearTimeout(reloj);

    if (!result.ok) {
      setState({ status: 'error', failure: classify(result.error.status, result.error.body) });
      return;
    }
    setState({
      status: 'done',
      insights: result.data.insights ?? [],
      narrative: result.data.narrative,
    });
    onCreditsUpdated(result.data.creditBalance);
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        {/*
          CU-868knx0vh: el sello del asesor es el Insight Point — el gradiente salvia del
          Brand Book. Es identidad ("esto lo escribió Macha"), no un dato, así que es uno
          de los pocos lugares donde el verde de MARCA es el correcto. La narrativa que
          va debajo sigue siendo texto neutro: el salvia marca el origen, no el contenido.
        */}
        <p className="flex items-center gap-2 font-mono text-eyebrow uppercase text-faint">
          {/*
            ═══ EL CÍRCULO VA SOLO ACÁ TAMBIÉN (reporte de Jose, 2026-08-26) ═══

            Llevaba un `Sparkles` de 12px adentro. Jose pidió explícitamente que este panel use
            *"el mismo elemento, el mismo circulito, con la misma animación"* que el asesor —
            son el mismo componente, así que tener uno con estrellita y el otro sin ella los
            hacía leer como dos cosas distintas.

            `md` (36px) y no `sm` (24px): sin ícono adentro, el círculo ES la figura. A 24px un
            disco liso al lado de un rótulo se lee como una viñeta, no como el sello de marca.

            A este tamaño la animación que se ve es la RESPIRACIÓN del glow, no el anillo — el
            anillo solo se monta en `lg` y `xl` porque a 36px un aro de 2px girando es un
            borrón. Es la misma decisión medida sobre el mockup, no una omisión acá.
          */}
          <InsightPoint size="md" state={selloState} />
          {/* CU-868kt8bg0: "Consejo Financiero Diario", no "IA". El nombre dice lo que el
              usuario recibe, no con qué está hecho. Y sale del diccionario: estaba quemado,
              así que en inglés también decía "IA". */}
          {labels.insightTitle}
        </p>
        <Button size="sm" onClick={generate} disabled={state.status === 'loading'}>
          {state.status === 'loading' ? labels.insightLoading : labels.insightCta}
        </Button>
      </div>

      {/*
        CU-868krvtjw: qué hace el botón, ANTES de apretarlo.

        En reposo el panel era un rótulo "IA" y un botón, sin una línea que dijera qué va a
        pasar ni sobre qué datos. Un botón que gasta créditos de la empresa no puede ser una
        incógnita — y la frase también fija la expectativa de lo que va a devolver, que es
        parte de que el resultado se lea como una respuesta y no como texto suelto.

        Desaparece en cuanto hay algo que mostrar: una vez que el consejo está en pantalla,
        explicar lo que el botón hace es ruido sobre el contenido.
      */}
      {state.status === 'idle' && (
        <p className="mt-2 text-body text-muted-foreground">{labels.insightIdle}</p>
      )}

      {state.status === 'done' && (
        <InsightCards insights={state.insights} narrative={state.narrative} labels={labels} />
      )}

      {state.status === 'error' && (
        <div className="mt-3 flex flex-col items-start gap-1">
          {state.failure.kind === 'insufficient' ? (
            <>
              <p className="text-body text-danger">{labels.insightInsufficientCredits}</p>
              {/* El 402 ya traía `{required, balance}` y se descartaba. Los números pasan
                  por `formatNumber` como cualquier otra cifra que el usuario lee. */}
              <p className="text-eyebrow tabular-nums text-muted-foreground">
                {labels.insightError.insufficientDetail
                  .replace('{required}', formatNumber(state.failure.required, locale))
                  .replace('{balance}', formatNumber(state.failure.balance, locale))}
              </p>
              {/* El enlace a comprar créditos SOLO aparece acá: es el único caso en que
                  pagar resuelve algo. */}
              <a href="/credits" className="text-body underline">
                {topUpLabel}
              </a>
            </>
          ) : (
            <>
              <p className="text-body text-muted-foreground">
                {state.failure.kind === 'rateLimited'
                  ? labels.insightError.rateLimited
                  : labels.insightError.failed}
              </p>
              {state.failure.kind === 'failed' && state.failure.detail && (
                <p className="text-eyebrow text-muted-foreground">{state.failure.detail}</p>
              )}
              <button type="button" onClick={generate} className="text-body underline">
                {labels.insightError.retry}
              </button>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * El consejo, en una tarjeta por insight y con su categoría (CU-868knx0vh).
 *
 * ═══ LA CATEGORÍA VIENE DEL BACKEND, NO SE ADIVINA ═══
 *
 * Una versión anterior de este componente NO ponía etiquetas, y por una buena razón:
 * `POST /insights` devolvía un solo texto plano, y la única forma de rotularlo desde acá
 * habría sido adivinar por palabras clave. Un insight sobre margen etiquetado "Cobranza" no
 * es un detalle estético — es información falsa en la pantalla donde el dueño decide.
 *
 * Ahora el backend clasifica de verdad (herramienta con esquema, `lib/anthropic.ts`) y manda
 * un CÓDIGO por insight. Acá solo se traduce con el diccionario, igual que se hace con
 * `ruleKey` de las alertas: el backend clasifica, el diccionario nombra.
 *
 * ═══ DEGRADACIÓN ═══
 *
 * Si `insights` viene vacío —el modelo contestó en prosa y no llamó a la herramienta— se
 * cae al texto partido por párrafo, SIN etiquetas. Es exactamente el comportamiento
 * anterior: preferible sin categoría que con la categoría equivocada.
 */
function InsightCards({
  insights,
  narrative,
  labels,
}: {
  insights: InsightResponse['insights'];
  narrative: string;
  labels: Dictionary['dashboard'];
}) {
  if (insights.length > 0) {
    return (
      <ul className="mt-3 flex flex-col gap-2">
        {ordenadosPorUrgencia(insights).map((insight, i) => (
          <li key={i} className="rounded-md border border-border bg-soft px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {/*
                La categoría va en mono y en tenue: ordena y agrupa, pero el protagonista es
                el consejo. Un chip de color acá competiría con los datos del dashboard — y
                además el color en este producto significa estado financiero, no tema.
              */}
              <span className="font-mono text-eyebrow uppercase text-faint">
                {categoria(insight.category, labels)}
              </span>
              {/*
                ═══ LA SEVERIDAD VA EN CHIP DE COLOR, PERO SOLO CUANDO DICE ALGO ═══

                Que lleve chip y no texto de color viene de CU-868ku6r48 y sigue vigente: la
                regla de los dos verdes exige que el estado nunca dependa solo del color, y acá
                no hay flecha que sirva de canal redundante (a diferencia del delta de un KPI),
                así que el fondo y el borde son obligatorios. Ver la nota de `DeltaBadge`. Y no
                contradice lo de la categoría: el color en este producto significa estado, y
                "esto urge" es estado; el tema no.

                ⚠️ `info` YA NO PINTA CHIP (CU-868kx7a73, reporte de Jose 2026-08-27).

                Su rótulo es "Contexto", y salía como un chip idéntico en peso a "Urgente" al
                lado del tema. Jose lo leyó como si fuera el tema —*"sale la palabra CONTEXTO;
                que ese tag sea según la data, por ejemplo cashflow o revenue"*— y tenía razón
                en la lectura: dos etiquetas contiguas del mismo tamaño se leen como una sola
                cosa, y la que no significaba nada era la que más llamaba la atención.

                La versión anterior ya ponía `info` en `neutral` "para no gastar la señal que
                `critical` necesita". Esto lleva ese razonamiento hasta el final: la
                forma más barata de no gastar la señal es NO EMITIRLA. La ausencia de chip ES
                "no urge", y quien tiene un consejo urgente lo ve solo en la tarjeta.

                Lo que NO cambia: `critical` y `warning` siguen en chip con fondo y borde, y el
                orden por urgencia sigue igual (`ordenadosPorUrgencia`), así que la severidad no
                se pierde — se deja de repetir donde no dice nada.
              */}
              {insight.severity && insight.severity !== 'info' && (
                <Badge variant={insight.severity === 'critical' ? 'danger' : 'warning'}>
                  {labels.insightSeverity[insight.severity]}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-body">{insight.text}</p>
            {/*
              La acción sugerida, como en el prototipo. Es TEXTO y no un enlace: el modelo la
              escribe en prosa ("Enviar carta de cobro a Embajada") y no hay a dónde navegar —
              fabricar un `href` obligaría a adivinar la pantalla, y un enlace que lleva al lugar
              equivocado es peor que una instrucción clara sin enlace.

              La flecha la marca como acción sin depender del color.
            */}
            {insight.action && (
              <p className="mt-1.5 flex items-start gap-1.5 text-caption font-medium text-foreground">
                <ArrowRight className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
                {insight.action}
              </p>
            )}
          </li>
        ))}
      </ul>
    );
  }

  // Sin clasificación: el camino de antes. Los párrafos son las unidades que el modelo
  // emitió; si viene todo junto, se pinta tal cual en vez de inventar un corte.
  const parrafos = narrative
    .split(/\n\s*\n|\n/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (parrafos.length <= 1) {
    return <p className="mt-3 whitespace-pre-wrap text-body">{narrative}</p>;
  }

  return (
    <ul className="mt-3 flex flex-col gap-2">
      {parrafos.map((texto, i) => (
        <li key={i} className="rounded-md border border-border bg-soft px-3 py-2.5">
          <span className="font-mono text-eyebrow text-faint">{i + 1}</span>
          <p className="mt-0.5 whitespace-pre-wrap text-body">{texto}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * Código → etiqueta. Una categoría que el backend agregue y el diccionario todavía no
 * conozca se muestra CRUDA en vez de romper la tarjeta: mismo criterio que `isKnownRule`
 * en las alertas.
 */
/**
 * Los consejos urgentes primero.
 *
 * El backend no garantiza orden —el modelo emite los insights en el orden que quiere— así que
 * sin esto un `critical` puede quedar tercero, debajo de dos `info`. Y el panel completo entra en
 * el rail derecho del dashboard: lo que queda abajo se lee tarde o no se lee.
 *
 * Orden ESTABLE dentro de cada nivel (`sort` de JS lo es desde ES2019), para no reordenar dos
 * consejos igual de urgentes entre renders y hacerlos saltar en pantalla.
 */
function ordenadosPorUrgencia(insights: InsightResponse['insights']): InsightResponse['insights'] {
  const rango: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return [...insights].sort((a, b) => rango[a.severity ?? 'info'] - rango[b.severity ?? 'info']);
}

function categoria(code: InsightCategory, labels: Dictionary['dashboard']): string {
  return labels.insightCategory[code] ?? code;
}

/**
 * Traduce el status del backend a un motivo. `POST /insights` responde 402 con
 * `{error: 'insufficient_credits', required, balance}` y 429 desde el token-bucket por
 * empresa / el gate de cola; cualquier otra cosa es un fallo del sistema.
 *
 * El 402 solo se toma como tal si el cuerpo trae los dos números: sin ellos no se puede
 * afirmar el saldo, y volver a caer en el mensaje genérico es preferible a inventarlo.
 */
function classify(status: number | undefined, body: unknown): Failure {
  if (status === 429) return { kind: 'rateLimited' };
  if (status === 402 && isInsufficient(body)) {
    return { kind: 'insufficient', required: body.required, balance: body.balance };
  }
  const detail = mensajeDeError(body);
  return { kind: 'failed', detail };
}

function isInsufficient(body: unknown): body is InsufficientCreditsResponse {
  if (!body || typeof body !== 'object') return false;
  const candidate = body as Partial<InsufficientCreditsResponse>;
  return typeof candidate.required === 'number' && typeof candidate.balance === 'number';
}

function mensajeDeError(body: unknown): string | undefined {
  if (!body || typeof body !== 'object' || !('error' in body)) return undefined;
  const value = (body as { error: unknown }).error;
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}
