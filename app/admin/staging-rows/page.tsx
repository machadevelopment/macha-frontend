import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { StagingRowsPanel } from '@/components/admin/staging-rows-panel';

export default function AdminStagingRowsPage() {
  const t = getDictionary(getLocale());
  return (
    <>
      <p className="font-mono text-eyebrow uppercase text-faint">{t.admin.stagingRows.eyebrow}</p>
      <h1 className="mb-5 text-h1">{t.admin.stagingRows.title}</h1>
      <StagingRowsPanel labels={t.admin.stagingRows} common={t.admin.common} />
    </>
  );
}
