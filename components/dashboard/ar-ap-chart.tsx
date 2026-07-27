'use client';

import { useEffect, useState } from 'react';
import { BarChart } from '@tremor/react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';
import type { ArApResponse } from '@/lib/api/dashboard';
import { chartColors } from '@/components/charts/chart-theme';

const BUCKET_ORDER = ['current', '1_30', '31_60', '61_90', '90_plus'] as const;

export function ArApChart({
  locale,
  title,
  arLabel,
  apLabel,
}: {
  locale: Locale;
  title: string;
  arLabel: string;
  apLabel: string;
}) {
  const [data, setData] = useState<ArApResponse | null>(null);

  useEffect(() => {
    fetch('/api/ar-ap')
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return null;
  const currency = data.baseCurrency as 'GTQ' | 'USD';

  const chartData = BUCKET_ORDER.map((bucket) => ({
    bucket,
    [arLabel]: data.ar[bucket],
    [apLabel]: data.ap[bucket],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <BarChart
        data={chartData}
        index="bucket"
        categories={[arLabel, apLabel]}
        colors={[chartColors.neutral, chartColors.negative]}
        valueFormatter={(v: number) => formatMoney(v, currency, locale)}
        className="h-64 font-mono text-eyebrow"
        showLegend
      />
    </Card>
  );
}
