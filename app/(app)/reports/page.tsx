import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { getActiveRole } from '@/lib/auth/active-role';
import { ReportsScreen } from '@/components/reports/reports-screen';

/**
 * Ticket B2: la pantalla deja de ser solo el historial. Arriba va el generador a demanda
 * y abajo se conserva el historial completo, tal cual pedía el ticket.
 *
 * El rol se resuelve server-side y baja como prop: generar GASTA CRÉDITOS, así que el
 * backend lo gatea con `edit_send_reports` (owner/admin) y no con la capacidad de lectura.
 * Esto solo evita pintarle al `member` un formulario que va a devolver 403 — la autoridad
 * sigue siendo el backend.
 */
export default async function ReportsPage() {
  const locale = getLocale();
  const t = getDictionary(locale);
  const role = await getActiveRole();

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <p className="font-mono text-eyebrow uppercase text-faint">{t.reports.eyebrow}</p>
      <h1 className="mb-5 text-h1">{t.reports.title}</h1>
      <ReportsScreen
        locale={locale}
        labels={t.reports}
        periodLabels={t.dashboard.period}
        common={t.common}
        canGenerate={role === 'owner' || role === 'admin'}
      />
    </main>
  );
}
