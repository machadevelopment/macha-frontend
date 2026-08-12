import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { getActiveRole } from '@/lib/auth/active-role';
import { CreditsPurchasePanel } from '@/components/credits/credits-purchase-panel';
import { PlanPanel } from '@/components/credits/plan-panel';

/**
 * CU-868kfvaet: pantalla de compra de créditos. middleware.ts ya exige sesión.
 *
 * Ticket B3 (ronda de QA 2026-08-11): pasa a ser GESTIÓN DE PLAN. El plan va arriba
 * porque es la decisión estructural —cuántos créditos entran cada mes— y la recarga
 * individual queda debajo, intacta, como lo que es: el parche para cuando se acaban antes
 * de tiempo. Invertir el orden dejaría la compra suelta como el camino principal, que es
 * justo lo que el ticket vino a corregir.
 *
 * El rol se resuelve acá, en el servidor, y baja como prop: `getActiveRole()` lleva
 * `server-only` y los paneles son client components. No es autorización — la autoridad es
 * la capacidad `billing` en macha-backend — sino evitar pintarle a un `member` botones que
 * van a devolver 403.
 */
export default async function CreditsPage() {
  const locale = getLocale();
  const t = getDictionary(locale);
  const role = await getActiveRole();

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <p className="font-mono text-eyebrow uppercase text-faint">{t.credits.eyebrow}</p>
      <h1 className="mb-1 text-h1">{t.credits.title}</h1>
      <p className="mb-4 text-body text-muted-foreground">{t.credits.subtitle}</p>

      <div className="flex flex-col gap-4">
        <PlanPanel locale={locale} labels={t.credits.plan} canChange={role === 'owner'} />

        <div>
          <p className="mb-2 text-cardh2">{t.credits.topUpTitle}</p>
          <CreditsPurchasePanel labels={t.credits} locale={locale} />
        </div>
      </div>
    </main>
  );
}
