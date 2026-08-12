import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { IndustryTemplatesPanel } from '@/components/admin/industry-templates-panel';

export default function AdminIndustryTemplatesPage() {
  const t = getDictionary(getLocale());
  return (
    <>
      <p className="font-mono text-eyebrow uppercase text-faint">
        {t.admin.industryTemplates.eyebrow}
      </p>
      <h1 className="mb-5 text-h1">{t.admin.industryTemplates.title}</h1>
      <IndustryTemplatesPanel labels={t.admin.industryTemplates} common={t.admin.common} />
    </>
  );
}
