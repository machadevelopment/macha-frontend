import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { AlertDetail } from '@/components/alerts/alert-detail';

// CU-868kh8jxf: destino de `alertUrl()` en macha-backend (`lib/app-urls.ts`). Antes de
// este ticket la ruta no existía y todo email de alerta caía en un 404.
export default function AlertDetailPage({ params }: { params: { id: string } }) {
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <p className="font-mono text-eyebrow uppercase text-faint">{t.alerts.eyebrow}</p>
      <h1 className="mb-5 text-h1">{t.alerts.title}</h1>
      <AlertDetail alertId={params.id} locale={locale} labels={t.alerts} />
    </main>
  );
}
