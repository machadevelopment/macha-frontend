import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { InventoryPanel } from '@/components/inventory/inventory-panel';

export default function InventoryPage() {
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <p className="font-mono text-eyebrow uppercase text-faint">{t.inventory.eyebrow}</p>
      <h1 className="text-h1">{t.inventory.title}</h1>
      <p className="mb-4 text-body text-muted-foreground">{t.inventory.subtitle}</p>
      <InventoryPanel locale={locale} labels={t.inventory} common={t.common} />
    </main>
  );
}
