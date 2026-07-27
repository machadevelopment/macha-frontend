import { IndustryTemplatesPanel } from '@/components/admin/industry-templates-panel';

export default function AdminIndustryTemplatesPage() {
  return (
    <>
      <p className="font-mono text-eyebrow uppercase text-faint">CATÁLOGO</p>
      <h1 className="mb-4 text-h1">Plantillas por industria</h1>
      <IndustryTemplatesPanel />
    </>
  );
}
