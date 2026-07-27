import { CreditRulesPanel } from '@/components/admin/credit-rules-panel';

export default function AdminCreditRulesPage() {
  return (
    <>
      <p className="font-mono text-eyebrow uppercase text-faint">CRÉDITOS</p>
      <h1 className="mb-4 text-h1">Acción ↔ créditos</h1>
      <CreditRulesPanel />
    </>
  );
}
