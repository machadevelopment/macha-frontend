'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
        <p className="flex items-center gap-1.5 font-mono text-eyebrow uppercase text-faint">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.7} />
          IA
        </p>
        <Button size="sm" onClick={generate} disabled={state.status === 'loading'}>
          {state.status === 'loading' ? labels.insightLoading : labels.insightCta}
        </Button>
      </div>

      {state.status === 'done' && (
        <p className="mt-3 whitespace-pre-wrap text-body">{state.narrative}</p>
      )}

      {state.status === 'error' && (
        <div className="mt-3 flex flex-col items-start gap-1">
          {state.failure.kind === 'insufficient' ? (
            <>
              <p className="text-body text-danger">{labels.insightInsufficientCredits}</p>
              {/* El 402 ya traía `{required, balance}` y se descartaba. Los números pasan
                  por `formatNumber` como cualquier otra cifra que el usuario lee. */}
              <p className="font-mono text-eyebrow tabular-nums text-muted-foreground">
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
