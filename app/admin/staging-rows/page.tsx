import { StagingRowsPanel } from '@/components/admin/staging-rows-panel';

export default function AdminStagingRowsPage() {
  return (
    <>
      <p className="font-mono text-eyebrow uppercase text-faint">INGESTA</p>
      <h1 className="mb-4 text-h1">Filas marcadas</h1>
      <StagingRowsPanel />
    </>
  );
}
