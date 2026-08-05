import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { ConfigPanel } from '@/components/admin/config-panel';

export default function AdminConfigPage() {
  const t = getDictionary(getLocale());
  return (
    <>
      <p className="font-mono text-eyebrow uppercase text-faint">{t.admin.config.eyebrow}</p>
      <h1 className="mb-4 text-h1">{t.admin.config.title}</h1>
      <ConfigPanel labels={t.admin.config} common={t.admin.common} />
    </>
  );
}
