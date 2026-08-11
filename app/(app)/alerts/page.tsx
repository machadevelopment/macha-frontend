import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { getActiveRole } from '@/lib/auth/active-role';
import { AlertsScreen } from '@/components/alerts/alerts-screen';

// CU-868kj0tdq criterio 1: el histórico. Hasta ahora `app/(app)/alerts/` solo tenía
// `[id]/page.tsx` — la pantalla del deep-link del email (CU-868kh8jxf).
//
// Ronda de QA 2026-08-11: se suma la vista de CONFIGURACIÓN, sin reemplazar el histórico.
// Son dos preguntas distintas —"qué me avisó" y "cuándo quiero que me avise"— y el ticket
// pide explícitamente conservar la primera.
//
// El rol se resuelve acá, en el servidor, y baja como prop: `getActiveRole()` lleva
// `server-only` y el panel es client component. No es autorización — la autoridad sigue
// siendo `configure_alerts` en macha-backend — sino evitar pintarle al `member` controles
// que el backend va a rechazar con 403.
export default async function AlertsPage() {
  const locale = getLocale();
  const t = getDictionary(locale);
  const role = await getActiveRole();

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <p className="font-mono text-eyebrow uppercase text-faint">{t.alerts.historyEyebrow}</p>
      <h1 className="mb-4 text-h1">{t.alerts.historyTitle}</h1>
      <AlertsScreen
        locale={locale}
        labels={t.alerts}
        common={t.common}
        canEdit={role === 'owner' || role === 'admin'}
      />
    </main>
  );
}
