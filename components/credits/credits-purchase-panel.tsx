'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { CreditsBadge } from '@/components/dashboard/credits-badge';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';
import { request, requestJson } from '@/lib/api/browser';
import type { CreditsTopupRequest, CreditsTopupResponse } from '@/lib/api/billing';

/**
 * CU-868kfvaet: pantalla de compra de créditos. Dispara el checkout de
 * Recurrente (POST /credits/topup vía /api/credits-topup) y redirige — el
 * saldo mostrado (criterio 3: siempre en créditos, nunca tokens/USD) solo se
 * actualiza tras la conciliación real del webhook, no aquí.
 */
export function CreditsPurchasePanel({
  labels,
  locale,
}: {
  labels: Dictionary['credits'];
  locale: Locale;
}) {
  const [balance, setBalance] = useState<number | null>(null);
  const [credits, setCredits] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<'generic' | 'forbidden' | null>(null);

  useEffect(() => {
    // CU-868kkgb3c: el único fetch sin protección de esta pantalla. El camino de compra
    // ya distinguía 403 de fallo genérico; este dejaba una unhandled rejection.
    void request<{ balance: number }>('/api/credits-balance').then((result) => {
      if (result.ok) setBalance(result.data.balance);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await requestJson<CreditsTopupResponse>('/api/credits-topup', 'POST', {
        credits,
      } satisfies CreditsTopupRequest);
      if (!result.ok) {
        // `requestJson` ya no deja pasar un fallo de red como excepción, así que el
        // `catch` genérico de antes sobra: el 403 (solo el owner puede comprar) sigue
        // distinguiéndose del resto.
        setError(result.error.status === 403 ? 'forbidden' : 'generic');
        return;
      }
      window.location.href = result.data.checkoutUrl;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-cardh2">{labels.currentBalance}</p>
        <CreditsBadge balance={balance} label={labels.creditsLabel} locale={locale} />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field
          id="credits"
          type="number"
          min={1}
          step={1}
          label={labels.quantity}
          required
          value={credits}
          onChange={(e) => setCredits(Number(e.target.value))}
        />

        {error === 'forbidden' && <p className="text-body text-danger">{labels.notOwner}</p>}
        {error === 'generic' && <p className="text-body text-danger">{labels.error}</p>}

        <Button type="submit" disabled={submitting || credits < 1}>
          {submitting ? labels.submitting : labels.submit}
        </Button>
      </form>
    </Card>
  );
}
