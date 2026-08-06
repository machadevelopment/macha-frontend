'use client';

import { useCallback, useEffect, useState } from 'react';
import { DollarSign, Receipt, PiggyBank, Percent, Wallet } from 'lucide-react';
import { KpiCard } from '@/components/charts/kpi-card';
import { LoadError } from '@/components/ui/load-error';
import { PeriodFilter } from '@/components/dashboard/period-filter';
import { request, type RequestError } from '@/lib/api/browser';
import { computeRange, type DateRange, type PeriodKey } from '@/lib/period';
import { formatMoney, formatPct } from '@/lib/format';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';
import type { PeriodMetricsResponse, PeriodTotals } from '@/lib/api/dashboard';

/**
 * Filtro de período + las cinco tarjetas, sobre el rango elegido.
 *
 * Sustituye al `KpiRow` de serie mensual fija, que se elimina en este mismo cambio:
 * aquel siempre mostraba el último mes cerrado, así que las píldoras no habrían
 * cambiado ningún número y el filtro habría sido decorativo. El estado del período
 * vive acá —y no en la página, que es un componente de servidor— porque cambia con un
 * clic y sin recargar.
 *
 * Los deltas se calculan contra `previous`, la ventana del MISMO tamaño inmediatamente
 * anterior que devuelve el backend. No se compara contra "el mes pasado" a secas: para
 * "hoy" eso sería absurdo.
 */
export function PeriodKpis({
  locale,
  labels,
  common,
}: {
  locale: Locale;
  labels: Dictionary['dashboard'];
  common: Dictionary['common'];
}) {
  const [periodo, setPeriodo] = useState<PeriodKey>('month');
  const [rango, setRango] = useState<DateRange>(() => computeRange('month', new Date()));
  const [data, setData] = useState<PeriodMetricsResponse | null>(null);
  const [error, setError] = useState<RequestError | null>(null);

  const cargar = useCallback(async (r: DateRange) => {
    setError(null);
    const res = await request<PeriodMetricsResponse>(
      `/api/metrics-period?from=${r.from}&to=${r.to}`,
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setData(res.data);
  }, []);

  useEffect(() => {
    void cargar(rango);
  }, [cargar, rango]);

  const GRID = 'grid grid-cols-1 gap-3 sm:grid-cols-2 app:grid-cols-3 xl:grid-cols-5';

  const filtro = (
    <PeriodFilter
      value={periodo}
      range={rango}
      onChange={(key, r) => {
        setPeriodo(key);
        setRango(r);
      }}
      locale={locale}
      labels={labels.period}
    />
  );

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        {filtro}
        <LoadError error={error} labels={common.loadError} onRetry={() => void cargar(rango)} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-3">
        {filtro}
        <div className={GRID}>
          {[0, 1, 2, 3, 4].map((i) => (
            <KpiCard key={i} label="" value="" loading />
          ))}
        </div>
      </div>
    );
  }

  const moneda = data.baseCurrency as 'GTQ' | 'USD';
  const gastos = (t: PeriodTotals) => t.cogs + t.opex;
  const utilidadBruta = (t: PeriodTotals) => t.revenue - t.cogs;
  const resultado = (t: PeriodTotals) => t.revenue - gastos(t);

  /** Fracción, no puntos porcentuales. `undefined` cuando no hay base con qué comparar. */
  const delta = (actual: number, previo: number): number | undefined =>
    previo === 0 ? undefined : (actual - previo) / Math.abs(previo);

  // El margen es null cuando no hubo ventas: un "0.0%" ahí se leería como "vendiste sin
  // ganar" en vez de "no vendiste" (CU-868kh8y58).
  const margen =
    data.current.revenue === 0 ? null : utilidadBruta(data.current) / data.current.revenue;

  const serie = (f: (t: PeriodTotals) => number) => data.series.map(f);

  return (
    <div className="flex flex-col gap-3">
      {filtro}
      <div className={GRID}>
        <KpiCard
          label={labels.kpi.revenue}
          icon={<DollarSign className="h-4 w-4" strokeWidth={1.7} />}
          value={formatMoney(data.current.revenue, moneda, locale)}
          hint={labels.kpi.revenueHint}
          delta={delta(data.current.revenue, data.previous.revenue)}
          deltaCaption={labels.kpi.vsPrevious}
          spark={serie((t) => t.revenue)}
          locale={locale}
        />
        <KpiCard
          label={labels.kpi.expenses}
          icon={<Receipt className="h-4 w-4" strokeWidth={1.7} />}
          value={formatMoney(gastos(data.current), moneda, locale)}
          hint={labels.kpi.expensesHint}
          delta={delta(gastos(data.current), gastos(data.previous))}
          deltaCaption={labels.kpi.vsPrevious}
          spark={serie(gastos)}
          invertDelta
          locale={locale}
        />
        <KpiCard
          label={labels.kpi.grossProfit}
          icon={<PiggyBank className="h-4 w-4" strokeWidth={1.7} />}
          value={formatMoney(utilidadBruta(data.current), moneda, locale)}
          hint={labels.kpi.grossProfitHint}
          delta={delta(utilidadBruta(data.current), utilidadBruta(data.previous))}
          deltaCaption={labels.kpi.vsPrevious}
          spark={serie(utilidadBruta)}
          locale={locale}
        />
        <KpiCard
          label={labels.kpi.margin}
          icon={<Percent className="h-4 w-4" strokeWidth={1.7} />}
          value={margen === null ? '—' : formatPct(margen, locale)}
          hint={labels.kpi.marginHint}
          locale={locale}
        />
        <KpiCard
          label={labels.kpi.cashFlow}
          icon={<Wallet className="h-4 w-4" strokeWidth={1.7} />}
          value={formatMoney(resultado(data.current), moneda, locale)}
          hint={labels.kpi.cashFlowHint}
          delta={delta(resultado(data.current), resultado(data.previous))}
          deltaCaption={labels.kpi.vsPrevious}
          spark={serie(resultado)}
          locale={locale}
        />
      </div>
    </div>
  );
}
