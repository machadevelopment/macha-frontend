'use client';

import { useEffect, useState } from 'react';
import { CreditsBadge } from '@/components/dashboard/credits-badge';
import { InsightPanel } from '@/components/dashboard/insight-panel';
import { request } from '@/lib/api/browser';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';

// Owns the credits balance so InsightPanel's post-debit result updates
// CreditsBadge instantly, without a refetch.
export function DashboardClient({
  locale,
  labels,
  topUpLabel,
}: {
  locale: Locale;
  labels: Dictionary['dashboard'];
  topUpLabel: string;
}) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    // CU-868kkgb3c: antes era `.then(r => r.json()).then(...)` sin `.catch`, así que un
    // fallo dejaba una unhandled rejection y el saldo en `null`.
    //
    // Que el saldo no cargue NO tiene estado de error visible a propósito: el badge ya
    // se oculta con `balance === null`, y un aviso de "no pudimos cargar tu saldo"
    // encima del dashboard es ruido para un dato accesorio. Lo que se arregla acá es que
    // el fallo deje de ser una excepción suelta. El bloqueo real por créditos lo decide
    // el backend en `POST /insights`, nunca este número.
    void request<{ balance: number }>('/api/credits-balance').then((result) => {
      if (!cancelled && result.ok) setBalance(result.data.balance);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <CreditsBadge balance={balance} label={labels.creditsLabel} />
      </div>
      <InsightPanel
        locale={locale}
        labels={labels}
        topUpLabel={topUpLabel}
        onCreditsUpdated={setBalance}
      />
    </div>
  );
}
