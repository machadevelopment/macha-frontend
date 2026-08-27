import { requireSession } from '@/lib/auth/session';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { activeCompanyId } from '@/lib/auth/active-company-server';
import { AppShell } from '@/components/shell/app-shell';
import { DisplayCurrencyScope } from '@/components/money/display-currency';

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
  const activeCompany = activeCompanyId(user.id);

  return (
    <AppShell
      shell={t.shell}
      common={t.common}
      locale={locale}
      userEmail={user.email}
      activeCompanyId={activeCompany}
    >
      {/*
        La moneda en la que el cliente está MIRANDO sus cifras vive acá y no en cada pantalla,
        al revés que `PeriodScope`. La diferencia tiene motivo: cambiar el período en una
        pantalla y que se moviera otra sería una sorpresa, pero quien puso el Dashboard en
        dólares y entra a Analítica espera seguir en dólares — volver a quetzales sola
        invitaría a comparar dos pantallas que no están en la misma unidad.

        Solo guarda la ELECCIÓN. La tasa se resuelve por pantalla contra su propio período
        (ver la cabecera de `display-currency.tsx`), así que montarlo acá no acopla nada.
      */}
      <DisplayCurrencyScope>{children}</DisplayCurrencyScope>
    </AppShell>
  );
}
