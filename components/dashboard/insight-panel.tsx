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
import type { InsightResponse, InsufficientCreditsResponse } from '@/lib/api/dashboard';

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
    | { status: 'done'; narrative: string }
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
    setState({ status: 'done', narrative: result.data.narrative });
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
          IA
        </p>
        <Button size="sm" onClick={generate} disabled={state.status === 'loading'}>
          {state.status === 'loading' ? labels.insightLoading : labels.insightCta}
        </Button>
      </div>

      {state.status === 'done' && <InsightCards narrative={state.narrative} />}

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
 * El consejo, partido en una tarjeta por insight (CU-868knx0vh).
 *
 * ═══ POR QUÉ NO HAY ETIQUETAS DE CATEGORÍA ═══
 *
 * El prompt de rediseño pide "tarjetas con etiqueta de categoría (Cobranza, Ventas,
 * Financiero)". NO SE IMPLEMENTAN, y no es por falta de ganas: `POST /insights` devuelve un
 * único `narrative` de TEXTO PLANO —el prompt del backend dice literalmente "Responde en
 * texto plano, sin markdown"— y no trae ningún campo de categoría.
 *
 * La única forma de poner esas etiquetas desde acá sería adivinarlas por palabras clave del
 * texto. Eso es rotular el consejo financiero de un cliente con una categoría que nadie
 * calculó: un insight sobre margen etiquetado "Cobranza" no es un detalle estético, es
 * información falsa en la pantalla donde el dueño decide.
 *
 * Para tenerlas de verdad hace falta que el backend las devuelva (structured output en
 * `generateInsightNarrative` + un campo por insight). OJO al hacerlo: el prompt vive en
 * `platform_settings.insight_prompt_template`, así que cambiar `DEFAULT_INSIGHT_PROMPT` NO
 * afecta a los entornos donde esa fila ya existe — hay que actualizar el parámetro desde
 * Business parameters.
 *
 * ═══ QUÉ SÍ SE HACE ═══
 *
 * Separar en tarjetas es fiel al dato: el prompt pide "2-3 insights", así que los párrafos
 * SON las unidades que el modelo emitió. Si no vinieran separados, esto degrada a una sola
 * tarjeta con el texto completo — que es exactamente lo correcto, y no una división
 * inventada a la mitad de una frase.
 */
function InsightCards({ narrative }: { narrative: string }) {
  const insights = narrative
    .split(/\n\s*\n|\n/)
    .map((t) => t.trim())
    .filter(Boolean);

  // Un solo bloque: se pinta como venía. Partir por punto sería inventar el corte.
  if (insights.length <= 1) {
    return <p className="mt-3 whitespace-pre-wrap text-body">{narrative}</p>;
  }

  return (
    <ul className="mt-3 flex flex-col gap-2">
      {insights.map((texto, i) => (
        <li
          key={i}
          /*
           * Superficie tenue y filete, no una tarjeta con sombra: estas viven DENTRO de una
           * Card que ya tiene la suya, y anidar dos sombras es lo que hace que un panel se
           * vea inflado en vez de jerárquico.
           */
          className="rounded-md border border-border bg-soft px-3 py-2.5"
        >
          {/*
            El número ordena sin nombrar. Es lo que se puede afirmar del dato —son el
            insight 1, 2 y 3 de esta corrida— a diferencia de una categoría, que habría que
            adivinar. Va en mono porque es un marcador, no una cifra de negocio.
          */}
          <span className="font-mono text-eyebrow text-faint">{i + 1}</span>
          <p className="mt-0.5 whitespace-pre-wrap text-body">{texto}</p>
        </li>
      ))}
    </ul>
  );
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
