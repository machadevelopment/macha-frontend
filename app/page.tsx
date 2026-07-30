import { redirect } from 'next/navigation';
import { getSignInUrl } from '@workos-inc/authkit-nextjs';
import { getOptionalSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import type { Membership } from '@/app/api/memberships/route';

/**
 * CU-868khvynk criterio 5: `/` deja de ser una lista de links sueltos.
 *
 * Antes esta pantalla era la única navegación de la app: cinco `<a>` planos que salían
 * pegados sin separación (`Upload dataFinancial overviewChatReportsBuy credits`), más el
 * org-switcher y el botón de cerrar sesión montados aquí como placeholder. Todo eso vive
 * ahora en el shell (`components/shell/app-shell.tsx`), así que aquí no queda nada que
 * mostrarle a una sesión con empresa: redirige a `/dashboard`.
 *
 * El archivo se movió de `app/(app)/page.tsx` a `app/page.tsx` — fuera del grupo de
 * rutas— porque `app/(app)/layout.tsx` monta el sidebar y `/` es la única ruta pública
 * (`middleware.ts`): un visitante sin sesión no debe ver el shell de una app en la que
 * todavía no entró.
 *
 * Se conservan las dos ramas que ya existían:
 *   - sin sesión → entrada a la hosted UI de WorkOS (CU-868kfva59). Sin formulario
 *     propio: CLAUDE.md manda hosted UI al 100%.
 *   - con sesión pero sin ninguna empresa → CTA de registro (CU-868kfvae1). Mandar a
 *     `/dashboard` a alguien sin empresa activa es mandarlo a una pantalla vacía.
 */
export default async function Home() {
  const { user, accessToken } = await getOptionalSession();
  const locale = getLocale();
  const t = getDictionary(locale);

  if (user && accessToken) {
    const memberships = await apiFetch<{ memberships: Membership[] }>('/me/memberships', {
      accessToken,
    });
    if (memberships.memberships.length > 0) redirect('/dashboard');

    return (
      <main data-density="comfortable" className="mx-auto max-w-app p-[var(--density-main-p)]">
        <div className="flex items-center justify-between">
          <p className="font-mono text-eyebrow uppercase text-faint">{t.home.eyebrow}</p>
          <LocaleSwitcher locale={locale} />
        </div>
        <h1 className="text-h1">{t.register.noMembershipsTitle}</h1>
        <p className="mb-3 text-body text-muted-foreground">{t.register.noMembershipsSubtitle}</p>
        <a href="/register" className="text-body underline">
          {t.register.noMembershipsCta}
        </a>
      </main>
    );
  }

  return (
    <main data-density="comfortable" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <div className="flex items-center justify-between">
        <p className="font-mono text-eyebrow uppercase text-faint">{t.home.eyebrow}</p>
        <LocaleSwitcher locale={locale} />
      </div>
      <h1 className="text-h1">{t.home.title}</h1>
      <p className="mb-3 text-body text-muted-foreground">{t.home.subtitle}</p>
      <a href={await getSignInUrl()} className="text-body underline">
        {t.common.signIn}
      </a>
    </main>
  );
}
