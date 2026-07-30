'use client';

import { useEffect, useState } from 'react';
import { KpiCard } from '@/components/charts/kpi-card';
import { formatMoney } from '@/lib/format';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';
import type { MetricsResponse } from '@/lib/api/dashboard';

export function KpiRow({
  locale,
  labels,
}: {
  locale: Locale;
  labels: Dictionary['dashboard']['kpi'];
}) {
  const [data, setData] = useState<MetricsResponse | null>(null);

  useEffect(() => {
    fetch('/api/metrics?months=2')
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 app:grid-cols-3">
        <KpiCard label={labels.revenue} value="" loading />
        <KpiCard label={labels.cogs} value="" loading />
        <KpiCard label={labels.margin} value="" loading />
      </div>
    );
  }

  const currency = data.baseCurrency as 'GTQ' | 'USD';
  const latest = data.months[data.months.length - 1];
  const previous = data.months[data.months.length - 2];

  function delta(current: number, prior?: number): number | undefined {
    if (prior === undefined || prior === 0) return undefined;
    return (current - prior) / Math.abs(prior);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 app:grid-cols-3">
      <KpiCard
        label={labels.revenue}
        value={formatMoney(latest?.revenue ?? 0, currency, locale)}
        delta={delta(latest?.revenue ?? 0, previous?.revenue)}
        locale={locale}
      />
      <KpiCard
        label={labels.cogs}
        value={formatMoney(latest?.cogs ?? 0, currency, locale)}
        delta={delta(latest?.cogs ?? 0, previous?.cogs)}
        invertDelta
        locale={locale}
      />
      <KpiCard
        label={labels.margin}
        value={formatMoney(latest?.margin ?? 0, currency, locale)}
        delta={delta(latest?.margin ?? 0, previous?.margin)}
        locale={locale}
      />
    </div>
  );
}
