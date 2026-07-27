import { Wallet } from 'lucide-react';

// CU-868kfvabk criterio 2 (no negociable): muestra el saldo en CRÉDITOS, nunca
// tokens ni USD — puramente presentacional, el fetch/estado vive en
// dashboard-client.tsx (compartido con InsightPanel para que el débito post-insight
// se refleje sin un refetch).
export function CreditsBadge({ balance, label }: { balance: number | null; label: string }) {
  if (balance === null) return null;
  return (
    <span className="flex items-center gap-1.5 font-mono text-eyebrow uppercase text-faint">
      <Wallet className="h-3.5 w-3.5" strokeWidth={1.7} />
      {balance} {label}
    </span>
  );
}
