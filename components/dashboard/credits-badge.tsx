import { Wallet } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';

// CU-868kfvabk criterio 2 (no negociable): muestra el saldo en CRÉDITOS, nunca
// tokens ni USD — puramente presentacional, el fetch/estado vive en
// advice-rail.tsx (compartido con InsightPanel para que el débito post-insight
// se refleje sin un refetch).
//
// CU-868kkgbtv: el saldo pasa por `formatNumber` con el locale activo. Antes se
// imprimía crudo (`{balance}`), así que 12500 salía `12500` en vez de `12,500` —
// la única cifra del producto que no pasaba por el formateo centralizado. No lleva
// código de moneda a propósito: son créditos, no dinero (criterio 2 de CU-868kfvabk).
export function CreditsBadge({
  balance,
  label,
  locale,
}: {
  balance: number | null;
  label: string;
  locale: Locale;
}) {
  if (balance === null) return null;
  return (
    <span className="flex items-center gap-1.5 font-mono text-eyebrow uppercase text-faint">
      <Wallet className="h-3.5 w-3.5" strokeWidth={1.7} />
      {formatNumber(balance, locale)} {label}
    </span>
  );
}
