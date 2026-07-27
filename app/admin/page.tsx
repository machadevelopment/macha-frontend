import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { CompaniesPanel } from '@/components/admin/companies-panel';

// CU-868kfvaf5: gestión de empresas + alta manual. role-gated vía backend staff tier.
export default function AdminHome() {
  const t = getDictionary(getLocale());
  return (
    <>
      <p className="font-mono text-eyebrow uppercase text-faint">{t.admin.eyebrow}</p>
      <h1 className="mb-4 text-h1">{t.admin.title}</h1>
      <CompaniesPanel />
    </>
  );
}
