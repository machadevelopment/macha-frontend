import { AiCostPanel } from '@/components/admin/ai-cost-panel';

export default function AdminAiCostPage() {
  return (
    <>
      <p className="font-mono text-eyebrow uppercase text-faint">COSTO IA</p>
      <h1 className="mb-4 text-h1">Costo por empresa</h1>
      <AiCostPanel />
    </>
  );
}
