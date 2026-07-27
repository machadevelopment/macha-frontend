import { ConfigPanel } from '@/components/admin/config-panel';

export default function AdminConfigPage() {
  return (
    <>
      <p className="font-mono text-eyebrow uppercase text-faint">CONFIGURACIÓN</p>
      <h1 className="mb-4 text-h1">Parámetros de negocio</h1>
      <ConfigPanel />
    </>
  );
}
