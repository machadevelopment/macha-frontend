import { DocumentsPanel } from '@/components/admin/documents-panel';

export default function AdminDocumentsPage() {
  return (
    <>
      <p className="font-mono text-eyebrow uppercase text-faint">MONITOREO</p>
      <h1 className="mb-4 text-h1">Uploads / procesos</h1>
      <DocumentsPanel />
    </>
  );
}
