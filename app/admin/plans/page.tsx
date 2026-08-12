import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { getStaffTier } from '@/lib/auth/staff-tier';
import { PlansPanel } from '@/components/admin/plans-panel';

/**
 * Catálogo de planes (ticket B3, ronda de QA 2026-08-11).
 *
 * Async como `app/admin/config/page.tsx`: el tier de staff se resuelve server-side con
 * `getStaffTier()` (que lleva `server-only`) y baja como prop, porque el panel es client
 * component. No duplica la matriz de permisos — la autoridad es
 * `manage_plans_and_templates` en macha-backend, y esto solo evita pintar controles que
 * van a devolver 403.
 */
export default async function AdminPlansPage() {
  const t = getDictionary(getLocale());
  const tier = await getStaffTier();

  return (
    <>
      <p className="font-mono text-eyebrow uppercase text-faint">{t.admin.plans.eyebrow}</p>
      <h1 className="mb-5 text-h1">{t.admin.plans.title}</h1>
      <PlansPanel labels={t.admin.plans} common={t.admin.common} canEdit={tier === 'super_admin'} />
    </>
  );
}
