'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
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
  | { kind: 'failed' };

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

    // `requestJson` no lanza. Antes un 502 con cuerpo HTML hacía que `res.json()`
    // lanzara dentro de `generate()`, sin `catch`: el botón se quedaba en "generando…"
    // para siempre y no había forma de reintentar sin recargar.
    const result = await requestJson<InsightResponse>('/api/insights', 'POST');

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
          <InsightPoint size="sm" state={selloState}>
            <Sparkles className="h-3 w-3" strokeWidth={1.9} />
          </InsightPoint>
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
                ═══ LA SEVERIDAD SÍ VA EN CHIP DE COLOR (CU-868ku6r48) ═══

                Y no contradice lo de arriba: eso dice que la CATEGORÍA no lleva color porque el
                color en este producto significa estado, no tema. La severidad ES estado — "esto
                urge" es exactamente la clase de cosa que el color existe para decir.

                Chip y no texto de color: la regla de los dos verdes exige que el estado nunca
                dependa solo del color, y acá no hay flecha que sirva de canal redundante (a
                diferencia del delta de un KPI), así que el fondo y el borde son obligatorios.
                Ver la nota de `DeltaBadge`.

                `info` va en `neutral` a propósito: es contexto, no un estado que reclame nada, y
                pintarlo de color gastaría la señal que `critical` necesita.
              */}
              <Badge
                variant={
                  insight.severity === 'critical'
                    ? 'danger'
                    : insight.severity === 'warning'
                      ? 'warning'
                      : 'neutral'
                }
              >
                {labels.insightSeverity[insight.severity ?? 'info']}
              </Badge>
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
  return { kind: 'failed' };
}

function isInsufficient(body: unknown): body is InsufficientCreditsResponse {
  if (!body || typeof body !== 'object') return false;
  const candidate = body as Partial<InsufficientCreditsResponse>;
  return typeof candidate.required === 'number' && typeof candidate.balance === 'number';
}
