'use client';

import { useEffect, useState } from 'react';
import { AreaChart } from '@tremor/react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';
import type { MetricsResponse } from '@/lib/api/dashboard';
import { chartColors } from '@/components/charts/chart-theme';

export function TrendChart({ locale, title }: { locale: Locale; title: string }) {
  const [data, setData] = useState<MetricsResponse | null>(null);

  useEffect(() => {
    fetch('/api/metrics?months=12')
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return null;
  const currency = data.baseCurrency as 'GTQ' | 'USD';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <AreaChart
        data={data.months}
        index="period"
        categories={['revenue', 'cogs', 'margin']}
        colors={[chartColors.neutral, chartColors.negative, chartColors.positive]}
        valueFormatter={(v: number) => formatMoney(v, currency, locale)}
        className="h-64 font-mono text-eyebrow"
        showLegend
        showGridLines
      />
    </Card>
  );
}
