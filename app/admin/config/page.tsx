import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { ConfigPanel } from '@/components/admin/config-panel';
import { getStaffTier } from '@/lib/auth/staff-tier';

export default async function AdminConfigPage() {
  const t = getDictionary(getLocale());

  /*
    CU-B7-QA-20260811: editar cualquier `platform_settings` exige la capacidad
    `edit_credits_to_tokens_param`, que en la matriz del backend
    (`macha-backend/src/lib/permissions.ts`) es exclusiva de `super_admin`. Se resuelve
    aquí con el MISMO `getStaffTier()` que ya usa `app/admin/layout.tsx` para gatear la
    ruta — memoizado por request, así que no suma un round-trip.

    Esto no es autorización: si el tier llegara inflado, el backend seguiría
    respondiendo 403. Sirve para que un `staff` no vea controles que no puede usar.
  */
  const canEdit = (await getStaffTier()) === 'super_admin';

  return (
    <>
      <p className="font-mono text-eyebrow uppercase text-faint">{t.admin.config.eyebrow}</p>
      <h1 className="mb-4 text-h1">{t.admin.config.title}</h1>
      <ConfigPanel labels={t.admin.config} common={t.admin.common} canEdit={canEdit} />
    </>
  );
}
