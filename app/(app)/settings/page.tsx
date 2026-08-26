import { Settings } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { getActiveRole } from '@/lib/auth/active-role';
import { FxRatePanel } from '@/components/settings/fx-rate-panel';

/**
 * Ajustes de la empresa. Nace con el tipo de cambio, que era lo que tenía este ticket
 * bloqueado hasta que Jose cerró quién lo mantiene (2026-08-25).
 *
 * El rol se resuelve en el SERVIDOR y baja como prop: `getActiveRole()` lleva `server-only` y
 * el panel es de cliente. No es autorización —la autoridad es la capacidad `manage_fx_rate` del
 * backend— sino no ofrecerle a un `member` un campo que va a devolver 403.
 */
export default async function SettingsPage() {
  const locale = getLocale();
  const t = getDictionary(locale);
  const role = await getActiveRole();

  return (
    <main data-density="comfortable" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <PageHeader icon={Settings} title={t.settings.title} subtitle={t.settings.subtitle} />
      <FxRatePanel
        locale={locale}
        labels={t.settings.fx}
        common={t.common}
        // Decisión de Jose: cualquier admin, no solo el dueño.
        puedeEditar={role === 'owner' || role === 'admin'}
      />
    </main>
  );
}
