import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { AlertList } from '@/components/alerts/alert-list';

// CU-868kj0tdq criterio 1: el histórico. Hasta ahora `app/(app)/alerts/` solo tenía
// `[id]/page.tsx` — la pantalla del deep-link del email (CU-868kh8jxf).
export default function AlertsPage() {
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <p className="font-mono text-eyebrow uppercase text-faint">{t.alerts.historyEyebrow}</p>
      <h1 className="mb-4 text-h1">{t.alerts.historyTitle}</h1>
      <AlertList locale={locale} labels={t.alerts} common={t.common} />
    </main>
  );
}
