'use client';

import { useEffect, useState } from 'react';
import { CreditsBadge } from '@/components/dashboard/credits-badge';
import { InsightPanel } from '@/components/dashboard/insight-panel';
import { KeyAlertsCard } from '@/components/dashboard/key-alerts-card';
import { request } from '@/lib/api/browser';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * Columna derecha del dashboard: el consejo del día y las alertas activas.
 *
 * Reemplaza a `DashboardClient`, que ponía el saldo de créditos y el panel de insight como
 * una banda ANCHA cruzando el dashboard entero. El prototipo "MVP Macha" los tiene en un
 * rail lateral, y el propio design guide ya especificaba el grid para eso —§4.4,
 * `g-main` = `1fr 348px`— sin que ninguna pantalla lo usara nunca. Este componente es la
 * mitad derecha de ese grid.
 *
 * Sigue siendo el dueño del saldo de créditos: el insight lo debita, y tenerlo acá permite
 * que el badge se actualice al instante con el saldo que devuelve la propia respuesta, sin
 * pagar otro round-trip.
 */
export function AdviceRail({
  locale,
  labels,
  alertLabels,
  common,
  topUpLabel,
}: {
  locale: Locale;
  labels: Dictionary['dashboard'];
  alertLabels: Dictionary['alerts'];
  common: Dictionary['common'];
  topUpLabel: string;
}) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Que el saldo no cargue NO tiene estado de error visible a propósito: el badge se
    // oculta con `balance === null`, y un aviso de "no pudimos cargar tu saldo" encima del
    // dashboard es ruido para un dato accesorio. El bloqueo real por créditos lo decide el
    // backend en `POST /insights`, nunca este número.
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
      <KeyAlertsCard
        locale={locale}
        labels={labels.keyAlerts}
        alertLabels={alertLabels}
        common={common}
      />
    </div>
  );
}
