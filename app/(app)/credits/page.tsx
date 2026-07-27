import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { CreditsPurchasePanel } from '@/components/credits/credits-purchase-panel';

// CU-868kfvaet: pantalla de compra de créditos. middleware.ts ya exige sesión.
export default function CreditsPage() {
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <p className="font-mono text-eyebrow uppercase text-faint">{t.credits.eyebrow}</p>
      <h1 className="mb-1 text-h1">{t.credits.title}</h1>
      <p className="mb-4 text-body text-muted-foreground">{t.credits.subtitle}</p>

      <CreditsPurchasePanel labels={t.credits} />
    </main>
  );
}
