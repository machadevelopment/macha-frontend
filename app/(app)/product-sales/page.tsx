import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { ProductSalesClient } from '@/components/product-sales/product-sales-client';

export default function ProductSalesPage() {
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <p className="font-mono text-eyebrow uppercase text-faint">{t.productSales.eyebrow}</p>
      <h1 className="text-h1">{t.productSales.title}</h1>
      <p className="mb-4 text-body text-muted-foreground">{t.productSales.subtitle}</p>
      <ProductSalesClient
        locale={locale}
        labels={t.productSales}
        periodLabels={t.dashboard.period}
        common={t.common}
      />
    </main>
  );
}
