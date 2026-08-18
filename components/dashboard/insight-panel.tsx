'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InsightPoint } from '@/components/ui/insight-point';
import { requestJson } from '@/lib/api/browser';
import { formatNumber } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type {
  InsightCategory,
  InsightResponse,
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
          <InsightPoint size="sm">
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
        {insights.map((insight, i) => (
          <li key={i} className="rounded-md border border-border bg-soft px-3 py-2.5">
            {/*
              La categoría va en mono y en tenue: ordena y agrupa, pero el protagonista es
              el consejo. Un chip de color acá competiría con los datos del dashboard — y
              además el color en este producto significa estado financiero, no tema.
            */}
            <span className="font-mono text-eyebrow uppercase text-faint">
              {categoria(insight.category, labels)}
            </span>
            <p className="mt-0.5 text-body">{insight.text}</p>
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
