'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { InsightResponse, InsufficientCreditsResponse } from '@/lib/api/dashboard';

// CU-868kfvabk: the hard block (criterio 3) is enforced server-side (POST
// /insights) — this component only reflects whatever the backend decides, it
// never estimates or bypasses the check itself.
export function InsightPanel({
  labels,
  topUpLabel,
  onCreditsUpdated,
}: {
  labels: Dictionary['dashboard'];
  topUpLabel: string;
  onCreditsUpdated: (balance: number) => void;
}) {
  const [state, setState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error' }
    | { status: 'done'; narrative: string }
  >({ status: 'idle' });

  async function generate() {
    setState({ status: 'loading' });
    const res = await fetch('/api/insights', { method: 'POST' });
    const data: InsightResponse | InsufficientCreditsResponse = await res.json();

    if (!res.ok || 'error' in data) {
      setState({ status: 'error' });
      return;
    }
    setState({ status: 'done', narrative: data.narrative });
    onCreditsUpdated(data.creditBalance);
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
        <div className="mt-3">
          <p className="text-body text-danger">{labels.insightInsufficientCredits}</p>
          <a href="/credits" className="text-body underline">
            {topUpLabel}
          </a>
        </div>
      )}
    </Card>
  );
}
