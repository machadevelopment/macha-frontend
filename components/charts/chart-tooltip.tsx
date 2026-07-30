'use client';

import type { CustomTooltipProps } from '@tremor/react';
import { formatMoney } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';

/**
 * CU-868khvyqa: tooltip compartido de los charts del dashboard.
 *
 * Existe porque `valueFormatter` de Tremor alimenta **el eje Y y el tooltip a la vez**.
 * El eje necesita la forma compacta (`GTQ 145 k`) para no recortarse, pero el tooltip es
 * donde el usuario va a leer la cifra: ahí tiene que estar el monto completo con su
 * código de moneda explícito. Este componente rompe ese empate — eje compacto,
 * tooltip exacto.
 *
 * Los colores del punto de cada serie vienen del propio payload de Recharts (`color`),
 * así que no se hardcodea ninguno: sigue la misma paleta que las series del chart.
 */
export function makeChartTooltip(currency: 'GTQ' | 'USD', locale: Locale) {
  return function ChartTooltip({ payload, active, label }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;

    return (
      <div className="rounded-md border border-border bg-card px-3 py-2 shadow-tab">
        <p className="font-mono text-eyebrow uppercase text-faint">{label}</p>
        <div className="mt-1 flex flex-col gap-1">
          {payload.map((entry, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-body">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}
              </span>
              <span className="font-mono tabular-nums text-body">
                {formatMoney(Number(entry.value ?? 0), currency, locale)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };
}
