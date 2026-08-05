import { redirect } from 'next/navigation';
import { getOptionalSession } from '@/lib/auth/session';
import { apiFetch, classifyApiFailure } from '@/lib/api/client';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { signOutAction } from '@/app/actions/sign-out';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';
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
    /**
     * CU-868kkgb8f criterio 2: `/` tiene que sobrevivir a un backend caído.
     *
     * Antes esta llamada iba sin red: `apiFetch` lanza ante cualquier non-2xx y `fetch`
     * rechaza si macha-backend no contesta, así que una caída del backend dejaba la única
     * ruta pública del producto —y la entrada a la hosted UI de WorkOS— mostrando la
     * pantalla de error cruda de Next. Lo perverso era que la salida del usuario (cerrar
     * sesión para limpiar una sesión vieja) vivía detrás de esa misma pantalla rota.
     *
     * `redirect()` funciona lanzando una excepción que Next captura; por eso la llamada
     * queda FUERA del `try`, o el `catch` se tragaría la redirección a `/dashboard`.
     */
    let memberships: Membership[] | null = null;
    try {
      const res = await apiFetch<{ memberships: Membership[] }>('/me/memberships', {
        accessToken,
      });
      memberships = res.memberships;
    } catch (error) {
      // No se pudo resolver la membresía. No es motivo para negarle al usuario las dos
      // acciones que sí puede tomar: reintentar o cerrar sesión.
      return <SessionUnavailable t={t} locale={locale} kind={classifyApiFailure(error)} />;
    }

    if (memberships.length > 0) redirect('/dashboard');

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
      {/*
        `/login` en vez de `await getSignInUrl()`: esa función escribe la cookie PKCE
        (getAuthURLAndSetPKCECookie), y Next.js solo permite mutar cookies en Server
        Actions y Route Handlers — desde aquí lanzaba y `/` devolvía 500. Ver
        app/login/route.ts.
      */}
      <a href="/login" className="text-body underline">
        {t.common.signIn}
      </a>
    </main>
  );
}

/**
 * CU-868kkgb8f criterio 2: hay sesión pero el backend no pudo confirmar la membresía.
 *
 * No es un `error.tsx`: `/` está fuera de `app/(app)/` y su boundary sería el
 * `global-error`, que reemplaza la app entera. Y sobre todo, esto no es una pantalla de
 * error a secas — es la pantalla donde el usuario tiene que poder **salir**. Por eso el
 * cierre de sesión está acá y no detrás de un reintento.
 *
 * Se ofrecen las dos acciones que sí pueden cambiar algo:
 *   - reintentar (recargar `/`), porque una caída de Railway suele ser pasajera;
 *   - cerrar sesión, que es lo único que arregla una sesión vieja y que hasta ahora vivía
 *     detrás de la pantalla rota.
 */
function SessionUnavailable({
  t,
  locale,
  kind,
}: {
  t: Dictionary;
  locale: Locale;
  kind: 'unavailable' | 'denied';
}) {
  return (
    <main
      data-density="comfortable"
      className="mx-auto flex min-h-screen max-w-app flex-col items-start justify-center gap-3 p-[var(--density-main-p)]"
    >
      <div className="flex w-full items-center justify-between">
        <p className="font-mono text-eyebrow uppercase text-faint">{t.home.eyebrow}</p>
        <LocaleSwitcher locale={locale} />
      </div>
      <h1 className="text-h1">{t.common.routeError.title}</h1>
      <p className="text-body text-muted-foreground">
        {kind === 'denied' ? t.common.routeError.denied : t.common.routeError.unavailable}
      </p>

      <div className="flex items-center gap-3">
        {/* Un 403 no se arregla reintentando: la salida es cerrar sesión, que queda abajo.
            `<a>` y no un botón con `router.refresh()`: mantiene esta pantalla como Server
            Component, sin JS de por medio que también pueda fallar. */}
        {kind !== 'denied' && (
          <a href="/" className="text-body underline">
            {t.common.routeError.retry}
          </a>
        )}
        <form action={signOutAction}>
          <button type="submit" className="text-body underline">
            {t.common.signOut}
          </button>
        </form>
      </div>
    </main>
  );
}
