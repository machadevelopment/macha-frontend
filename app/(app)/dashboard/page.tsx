import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { PeriodKpis } from '@/components/dashboard/period-kpis';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { ArApChart } from '@/components/dashboard/ar-ap-chart';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { IngestStatusBanner } from '@/components/dashboard/ingest-status-banner';
import { DashboardGreeting } from '@/components/dashboard/dashboard-greeting';

// CU-868kfvabe/868kfvabk: dashboard ejecutivo. middleware.ts ya exige sesión.
export default function DashboardPage() {
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <div className="mb-4">
        <DashboardGreeting locale={locale} labels={t.dashboard} />
      </div>

      {/* Antes de los KPIs a propósito: si los números están en cero porque una carga
          está en revisión, el motivo tiene que leerse antes que los ceros. */}
      <div className="mb-4">
        <IngestStatusBanner labels={t.dashboard.ingest} />
      </div>

      <DashboardClient locale={locale} labels={t.dashboard} topUpLabel={t.credits.topUpCta} />

      <div className="mt-4">
        <PeriodKpis locale={locale} labels={t.dashboard} common={t.common} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 app:grid-cols-2">
        <TrendChart
          locale={locale}
          title={t.dashboard.trendTitle}
          labels={t.dashboard}
          common={t.common}
        />
        <ArApChart
          locale={locale}
          title={t.dashboard.arApTitle}
          arLabel={t.dashboard.ar}
          apLabel={t.dashboard.ap}
          agingLabel={t.dashboard.chart.aging}
          common={t.common}
        />
      </div>
    </main>
  );
}
