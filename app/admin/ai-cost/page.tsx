import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { AiCostPanel } from '@/components/admin/ai-cost-panel';

export default function AdminAiCostPage() {
  const t = getDictionary(getLocale());
  return (
    <>
      <p className="font-mono text-eyebrow uppercase text-faint">{t.admin.aiCost.eyebrow}</p>
      <h1 className="mb-5 text-h1">{t.admin.aiCost.title}</h1>
      <AiCostPanel labels={t.admin.aiCost} common={t.admin.common} />
    </>
  );
}
