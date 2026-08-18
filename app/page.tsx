import { redirect } from 'next/navigation';
import { getOptionalSession } from '@/lib/auth/session';
import { apiFetch, classifyApiFailure } from '@/lib/api/client';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { MachaMark } from '@/components/ui/macha-mark';
import {
  ShowcaseFrame,
  ShowcaseHeading,
  showcaseCta,
  showcaseCtaSecondary,
} from '@/components/ui/showcase';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { signOutAction } from '@/app/actions/sign-out';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';
import type { Membership } from '@/app/api/memberships/route';
import type { PendingInvitation } from '@/lib/api/invitations';

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
 *
 * CU-868knx0vh — ZONA DE VITRINA. Esta ruta es la primera impresión del producto: es lo
 * que ve un cliente nuevo y lo que ve un inversionista al que le pasan el link, y hasta
 * hoy era un eyebrow, un título y un `<a>` subrayado sobre fondo liso. Ahora las tres
 * ramas —entrada, sin empresa y backend caído— comparten el mismo marco de marca: el
 * Insight Point como atmósfera, el sello con el isotipo y el titular en `display`.
 *
 * Aquí el verde de MARCA es el correcto porque no hay un solo dato en pantalla; en cuanto
 * el usuario entra al dashboard el salvia desaparece y el color pasa a ser funcional.
 */
export default async function Home({ searchParams }: { searchParams?: { auth_error?: string } }) {
  const { user, accessToken } = await getOptionalSession();
  const locale = getLocale();
  const t = getDictionary(locale);
  // CU-868kmr0j5: `/callback` redirige aquí cuando el intercambio código→sesión falla,
  // en vez del 500 crudo que devolvía antes. Ver app/callback/route.ts.
  const authError = searchParams?.auth_error === '1';

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

    /*
     * ═══ CU-868ktkq8r: SIN EMPRESA NO SIGNIFICA "REGÍSTRATE" ═══
     *
     * Esta rama era la trampa que reportó QA. Un usuario sin membresías veía UNA sola
     * salida —"Registrar mi empresa"— y el invitado que llegó hasta acá sin su `?token=`
     * (porque el viaje por AuthKit incluye crear cuenta y verificar correo, y ahí la
     * query se pierde de formas que no controlamos) es exactamente un usuario sin
     * membresías. Seguía el único botón que había y terminaba de dueño de una empresa
     * vacía en vez de miembro de la que lo invitó: en un producto multi-tenant con datos
     * financieros eso no es un desvío cosmético.
     *
     * La invitación se descubre por el CORREO de la sesión, no por el enlace, así que
     * aparece igual aunque el token se haya perdido. Cuando la hay, es la acción
     * PRINCIPAL y el alta baja a secundaria: quien fue invitado casi nunca quiere crear
     * una empresa, pero prohibírselo sería inventar una regla que nadie pidió.
     *
     * Va dentro del mismo `try` que las membresías a propósito: si el backend está
     * caído ya se sale por `SessionUnavailable`, y un segundo `catch` que se trague el
     * fallo dejaría la pantalla mintiendo ("no tienes invitaciones") justo cuando no
     * puede saberlo.
     */
    let invitations: PendingInvitation[] = [];
    try {
      const res = await apiFetch<{ invitations: PendingInvitation[] }>('/invitations/pending', {
        accessToken,
      });
      invitations = res.invitations;
    } catch (error) {
      return <SessionUnavailable t={t} locale={locale} kind={classifyApiFailure(error)} />;
    }

    if (invitations.length > 0) {
      return (
        <PublicScreen locale={locale}>
          <ShowcaseHeading
            eyebrow={t.members.accept.eyebrow}
            title={t.members.accept.pendingTitle}
            subtitle={
              invitations.length === 1
                ? t.members.accept.pendingSubtitle.replace('{company}', invitations[0]!.companyName)
                : t.members.accept.pendingSubtitleMany
            }
          />
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href="/invitations/accept" className={showcaseCta}>
              {t.members.accept.pendingCta}
            </a>
            <a href="/register" className={showcaseCtaSecondary}>
              {t.register.noMembershipsCta}
            </a>
          </div>
        </PublicScreen>
      );
    }

    return (
      <PublicScreen locale={locale}>
        <ShowcaseHeading
          eyebrow={t.register.eyebrow}
          title={t.register.noMembershipsTitle}
          subtitle={t.register.noMembershipsSubtitle}
        />
        <a href="/register" className={showcaseCta}>
          {t.register.noMembershipsCta}
        </a>
      </PublicScreen>
    );
  }

  return (
    <PublicScreen locale={locale}>
      <ShowcaseHeading eyebrow={t.home.eyebrow} title={t.home.title} subtitle={t.home.subtitle} />
      {authError && (
        // Color como señal de estado, con texto+fondo+borde juntos (design guide). Rojo
        // funcional y no marca: esto dice "algo salió mal", no "esto es Macha".
        <p
          role="alert"
          className="max-w-[52ch] rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-center text-body text-danger"
        >
          {t.home.authError}
        </p>
      )}
      {/*
        `/login` en vez de `await getSignInUrl()`: esa función escribe la cookie PKCE
        (getAuthURLAndSetPKCECookie), y Next.js solo permite mutar cookies en Server
        Actions y Route Handlers — desde aquí lanzaba y `/` devolvía 500. Ver
        app/login/route.ts.
      */}
      <a href="/login" className={showcaseCta}>
        {t.common.signIn}
      </a>
    </PublicScreen>
  );
}

/**
 * El marco común de las tres ramas de `/`.
 *
 * El wordmark arriba a la izquierda y el selector de idioma a la derecha: son los dos
 * elementos que esta pantalla tiene y el shell no puede darle —`/` vive fuera de
 * `app/(app)/`, sin sidebar—, y quien llega sin sesión necesita poder cambiar el idioma
 * ANTES de entrar, no después.
 *
 * El bloque central va con `my-auto` dentro de una columna de altura completa: centrado
 * vertical de verdad, que es lo que hace que una vitrina se lea como una portada y no como
 * un documento que empieza arriba a la izquierda.
 */
function PublicScreen({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <ShowcaseFrame className="min-h-dvh">
      <main
        data-density="comfortable"
        className="mx-auto flex min-h-dvh max-w-[880px] flex-col p-[var(--density-main-p)]"
      >
        <div className="flex items-center justify-between">
          {/* Wordmark, no clave de i18n: es la marca (design guide.md §7), igual que en el
              sidebar del shell. */}
          <span className="flex items-center gap-1.5 font-ui text-[17px] font-bold tracking-[-0.03em] text-foreground">
            <MachaMark />
            Macha
          </span>
          <LocaleSwitcher locale={locale} />
        </div>
        <div className="my-auto flex flex-col items-center gap-6 py-10">{children}</div>
      </main>
    </ShowcaseFrame>
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
    <PublicScreen locale={locale}>
      <ShowcaseHeading
        eyebrow={t.home.eyebrow}
        title={t.common.routeError.title}
        subtitle={kind === 'denied' ? t.common.routeError.denied : t.common.routeError.unavailable}
      />

      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* Un 403 no se arregla reintentando: la salida es cerrar sesión, que queda al lado.
            `<a>` y no un botón con `router.refresh()`: mantiene esta pantalla como Server
            Component, sin JS de por medio que también pueda fallar.

            Reintentar es la acción principal (tinta) y cerrar sesión la secundaria: en el
            caso normal —Railway pasajero— la primera es la que sirve. Con un 403 solo queda
            la segunda, y ahí es la única que se pinta. */}
        {kind !== 'denied' && (
          <a href="/" className={showcaseCta}>
            {t.common.routeError.retry}
          </a>
        )}
        <form action={signOutAction}>
          <button type="submit" className={kind === 'denied' ? showcaseCta : showcaseCtaSecondary}>
            {t.common.signOut}
          </button>
        </form>
      </div>
    </PublicScreen>
  );
}
