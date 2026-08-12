import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { CreditRulesPanel } from '@/components/admin/credit-rules-panel';

export default function AdminCreditRulesPage() {
  const t = getDictionary(getLocale());
  return (
    <>
      <p className="font-mono text-eyebrow uppercase text-faint">{t.admin.creditRules.eyebrow}</p>
      <h1 className="mb-5 text-h1">{t.admin.creditRules.title}</h1>
      <CreditRulesPanel labels={t.admin.creditRules} common={t.admin.common} />
    </>
  );
}
