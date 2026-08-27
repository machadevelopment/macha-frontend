import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { AnalyticsClient } from '@/components/analytics/analytics-client';
import { getActiveRole } from '@/lib/auth/active-role';

/**
 * Analítica — una de las tres pantallas del prototipo MVP Macha que existían en la maqueta
 * y no en la app. Server component: solo resuelve idioma y textos; el período cambia con
 * un clic y sin recargar, así que ese estado vive en el cliente.
 */
export default async function AnalyticsPage() {
  const locale = getLocale();
  const t = getDictionary(locale);
  /*
   * El rol se resuelve en el SERVIDOR y baja como prop: `getActiveRole()` lleva `server-only` y
   * el cliente de Analítica no puede importarlo. No es autorización —la autoridad es la
   * capacidad `settle_receivables` del backend— sino no ofrecer un botón que daría 403.
   */
  const role = await getActiveRole();

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <PageHeader icon={BarChart3} title={t.analytics.title} />
      <AnalyticsClient
        locale={locale}
        labels={t.analytics}
        // Los textos de KPI se toman del dashboard, no se duplican bajo `analytics`: son
        // las mismas métricas del mismo endpoint, y dos juegos de etiquetas para lo mismo
        // acaban divergiendo. Mismo criterio que `periodLabels`, que ya venía de ahí.
        kpiLabels={t.dashboard.kpi}
        periodLabels={t.dashboard.period}
        viewCurrencyLabels={t.dashboard.viewCurrency}
        role={role}
        common={t.common}
      />
    </main>
  );
}
