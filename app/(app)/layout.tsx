import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth/session';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';
import { AppShell } from '@/components/shell/app-shell';

/**
 * CU-868khvynk criterio 1: el shell compartido de la app de cliente.
 *
 * Este archivo no existía. Las siete pantallas de `app/(app)/` renderizaban cada una
 * su `<main>` suelto sin nada en común, así que estando en `/dashboard` no había forma
 * de llegar a `/reports` salvo escribiendo la URL. Contrastaba con `/admin/*`, que sí
 * tenía layout con nav desde el principio.
 *
 * `/` NO cuelga de aquí: se movió a `app/page.tsx` (fuera del grupo) porque es la única
 * ruta pública —la entrada a la hosted UI de WorkOS— y no debe renderizar el sidebar de
 * una sesión que todavía no existe.
 *
 * `requireSession()` en vez de `getOptionalSession()`: `middleware.ts` ya exige sesión
 * en todo lo que no sea `/` ni `/callback`, así que aquí no hay rama de invitado que
 * atender. El email alimenta el `side-bot`.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSession();
  const locale = getLocale();
  const t = getDictionary(locale);
  const activeCompanyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;

  return (
    <AppShell
      shell={t.shell}
      common={t.common}
      locale={locale}
      userEmail={user.email}
      activeCompanyId={activeCompanyId}
    >
      {children}
    </AppShell>
  );
}
