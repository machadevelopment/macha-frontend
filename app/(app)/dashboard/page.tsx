import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { PeriodKpis } from '@/components/dashboard/period-kpis';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { ArApChart } from '@/components/dashboard/ar-ap-chart';
import { AdviceRail } from '@/components/dashboard/advice-rail';
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
          está en revisión, el motivo tiene que leerse antes que los ceros. Va FUERA del
          grid porque aplica a toda la pantalla, no a una columna. */}
      <div className="mb-4">
        <IngestStatusBanner labels={t.dashboard.ingest} />
      </div>

      {/*
        Grid `g-main` del design guide §4.4: `1fr 348px`. Estaba especificado desde el
        principio y ninguna pantalla lo usaba — el insight y el saldo cruzaban el dashboard
        como una banda ancha. El rail es lo que el prototipo "MVP Macha" tiene ahí.

        Colapsa a una sola columna bajo 1080px (breakpoint `app`, el mismo en el que el
        sidebar pasa al drawer): en un teléfono el rail va debajo del contenido, no al lado.
      */}
      <div className="grid grid-cols-1 gap-4 app:grid-cols-[1fr_348px]">
        <div className="flex min-w-0 flex-col gap-4">
          <PeriodKpis locale={locale} labels={t.dashboard} common={t.common} />

          {/* Los dos charts pasan a apilarse dentro de la columna principal. Lado a lado
              dentro de `1fr` quedaban de ~380px cada uno y el eje de fechas se volvía
              ilegible — el problema que ya arregló CU-868khvyqa una vez. */}
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

        <AdviceRail
          locale={locale}
          labels={t.dashboard}
          alertLabels={t.alerts}
          common={t.common}
          topUpLabel={t.credits.topUpCta}
        />
      </div>
    </main>
  );
}
