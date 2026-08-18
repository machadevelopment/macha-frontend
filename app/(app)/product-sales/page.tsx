import { ShoppingCart } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { ProductSalesClient } from '@/components/product-sales/product-sales-client';

export default function ProductSalesPage() {
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <PageHeader
        icon={ShoppingCart}
        title={t.productSales.title}
        subtitle={t.productSales.subtitle}
      />
      <ProductSalesClient
        locale={locale}
        labels={t.productSales}
        periodLabels={t.dashboard.period}
        common={t.common}
      />
    </main>
  );
}
