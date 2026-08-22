import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { DemoRequestsPanel } from '@/components/admin/demo-requests-panel';

/** Solicitudes de demo de la landing (Jose 2026-08-21). */
export default function AdminDemoRequestsPage() {
  const t = getDictionary(getLocale());

  return (
    <>
      <p className="font-mono text-eyebrow uppercase text-faint">{t.admin.demoRequests.eyebrow}</p>
      <h1 className="mb-5 text-h1">{t.admin.demoRequests.title}</h1>
      <DemoRequestsPanel labels={t.admin.demoRequests} common={t.admin.common} />
    </>
  );
}
