import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { ReportDetail } from '@/components/reports/report-detail';

export default function ReportDetailPage({ params }: { params: { id: string } }) {
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      {/* CU-868khvzve: el h1 estático decía "Reportes", igual que la pantalla de lista.
          Ahora el título lo pone ReportDetail con el período real del reporte, que es lo
          que identifica al documento. El eyebrow se queda acá porque no depende del
          fetch y evita que la cabecera aparezca vacía mientras carga. */}
      <p className="mb-4 font-mono text-eyebrow uppercase text-faint">{t.reports.eyebrow}</p>
      <ReportDetail reportId={params.id} locale={locale} labels={t.reports} />
    </main>
  );
}
