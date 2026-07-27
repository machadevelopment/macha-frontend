import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { KpiRow } from '@/components/dashboard/kpi-row';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { ArApChart } from '@/components/dashboard/ar-ap-chart';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

// CU-868kfvabe/868kfvabk: dashboard ejecutivo. middleware.ts ya exige sesión.
export default function DashboardPage() {
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <p className="font-mono text-eyebrow uppercase text-faint">{t.dashboard.eyebrow}</p>
      <h1 className="mb-4 text-h1">{t.dashboard.title}</h1>

      <DashboardClient labels={t.dashboard} topUpLabel={t.credits.topUpCta} />

      <div className="mt-4">
        <KpiRow locale={locale} labels={t.dashboard.kpi} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <TrendChart locale={locale} title={t.dashboard.trendTitle} />
        <ArApChart
          locale={locale}
          title={t.dashboard.arApTitle}
          arLabel={t.dashboard.ar}
          apLabel={t.dashboard.ap}
        />
      </div>
    </main>
  );
}
