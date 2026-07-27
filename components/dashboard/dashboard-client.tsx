'use client';

import { useEffect, useState } from 'react';
import { CreditsBadge } from '@/components/dashboard/credits-badge';
import { InsightPanel } from '@/components/dashboard/insight-panel';
import type { Dictionary } from '@/lib/i18n/dictionary';

// Owns the credits balance so InsightPanel's post-debit result updates
// CreditsBadge instantly, without a refetch.
export function DashboardClient({ labels }: { labels: Dictionary['dashboard'] }) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/credits-balance')
      .then((r) => r.json())
      .then((data: { balance: number }) => setBalance(data.balance));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <CreditsBadge balance={balance} label={labels.creditsLabel} />
      </div>
      <InsightPanel labels={labels} onCreditsUpdated={setBalance} />
    </div>
  );
}
