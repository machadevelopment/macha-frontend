import { Boxes } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { InventoryPanel } from '@/components/inventory/inventory-panel';

export default function InventoryPage() {
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <PageHeader icon={Boxes} title={t.inventory.title} subtitle={t.inventory.subtitle} />
      <InventoryPanel locale={locale} labels={t.inventory} common={t.common} />
    </main>
  );
}
