import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { ReportDetail } from '@/components/reports/report-detail';

export default function ReportDetailPage({ params }: { params: { id: string } }) {
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <p className="font-mono text-eyebrow uppercase text-faint">{t.reports.eyebrow}</p>
      <h1 className="mb-4 text-h1">{t.reports.title}</h1>
      <ReportDetail reportId={params.id} locale={locale} labels={t.reports} />
    </main>
  );
}
