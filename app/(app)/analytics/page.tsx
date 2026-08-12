import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { AnalyticsClient } from '@/components/analytics/analytics-client';

/**
 * Analítica — una de las tres pantallas del prototipo MVP Macha que existían en la maqueta
 * y no en la app. Server component: solo resuelve idioma y textos; el período cambia con
 * un clic y sin recargar, así que ese estado vive en el cliente.
 */
export default function AnalyticsPage() {
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <p className="font-mono text-eyebrow uppercase text-faint">{t.analytics.eyebrow}</p>
      <h1 className="text-h1">{t.analytics.title}</h1>
      <p className="mb-4 text-body text-muted-foreground">{t.analytics.subtitle}</p>
      <AnalyticsClient
        locale={locale}
        labels={t.analytics}
        // Los textos de KPI se toman del dashboard, no se duplican bajo `analytics`: son
        // las mismas métricas del mismo endpoint, y dos juegos de etiquetas para lo mismo
        // acaban divergiendo. Mismo criterio que `periodLabels`, que ya venía de ahí.
        kpiLabels={t.dashboard.kpi}
        periodLabels={t.dashboard.period}
        common={t.common}
      />
    </main>
  );
}
