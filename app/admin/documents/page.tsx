import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { DocumentsPanel } from '@/components/admin/documents-panel';

export default function AdminDocumentsPage() {
  const t = getDictionary(getLocale());
  return (
    <>
      <p className="font-mono text-eyebrow uppercase text-faint">{t.admin.documents.eyebrow}</p>
      <h1 className="mb-5 text-h1">{t.admin.documents.title}</h1>
      <DocumentsPanel labels={t.admin.documents} common={t.admin.common} />
    </>
  );
}
