import { redirect } from 'next/navigation';
import { getOptionalSession } from '@/lib/auth/session';
import { apiFetch, classifyApiFailure } from '@/lib/api/client';
import { PublicScreen } from '@/components/ui/public-screen';
import { ShowcaseHeading, showcaseCta, showcaseCtaSecondary } from '@/components/ui/showcase';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { signOutAction } from '@/app/actions/sign-out';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';
import type { Membership } from '@/app/api/memberships/route';
import type { PendingInvitation } from '@/lib/api/invitations';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * A DÓNDE VA QUIEN ACABA DE INICIAR SESIÓN
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Esta lógica vivía en `app/page.tsx`, porque `/` hacía DOS trabajos a la vez: ser la portada
 * pública y decidir el destino de quien volvía de WorkOS. Se separaron el 2026-08-21, cuando
 * `macha.finance` pasó a ser una landing (pedido de Keneth).
 *
 * No es una pantalla, es una BIFURCACIÓN, y por eso casi nunca se ve: el caso normal redirige
 * a `/dashboard` sin pintar nada. Lo que pinta son los casos donde el usuario tiene una sesión
 * válida y aun así no puede entrar todavía.
 *
 * ═══ POR QUÉ NO PUEDE VIVIR EN EL CALLBACK ═══
 *
 * Sería lo natural —`/callback` ya es el que recibe a quien vuelve de WorkOS— y no se puede:
 * es un Route Handler generado por `handleAuth()` del SDK, sin cuerpo propio donde meter una
 * consulta al backend. Lo único que expone es `returnPathname`, y de ahí que apunte acá.
 *
 * ═══ POR QUÉ NO PUEDE VIVIR EN EL LAYOUT DE `(app)` ═══
 *
 * También sería razonable: todas las pantallas de cliente pasan por ahí. Pero ese layout monta
 * el sidebar, y las tres ramas de abajo son justamente las de alguien que NO debe verlo
 * todavía —no tiene empresa, o tiene una invitación sin aceptar—. Un shell de navegación
 * alrededor de "todavía no perteneces a ninguna empresa" invita a usar links que no llevan a
 * ninguna parte.
 *
 * Las cuatro ramas se conservan tal como estaban, con su razón intacta:
 *   · con empresa            → `/dashboard`
 *   · con invitación pendiente → aceptarla (principal) o registrar la propia (secundaria)
 *   · sin nada              → registrar empresa
 *   · backend caído          → `SessionUnavailable`, que es la pantalla donde se puede SALIR
 */
export default async function Continue() {
  const { user, accessToken } = await getOptionalSession();
  const locale = getLocale();
  const t = getDictionary(locale);

  /*
   * Sin sesión no hay nada que bifurcar: se manda a iniciarla.
   *
   * El middleware ya exige sesión en esta ruta —no está en `unauthenticatedPaths`—, así que
   * llegar acá sin ella no debería pasar. La rama existe igual porque `getOptionalSession()`
   * puede devolver una sesión ilegible (cookie corrupta, `WORKOS_COOKIE_PASSWORD` rotado) que
   * el middleware da por buena, y sin esto la página seguiría hasta el `apiFetch` con
   * `accessToken` en `undefined` para terminar en un fallo de red confuso.
   */
  if (!user || !accessToken) redirect('/login');

  /**
   * CU-868kkgb8f criterio 2: esta bifurcación tiene que sobrevivir a un backend caído.
   *
   * Antes esta llamada iba sin red: `apiFetch` lanza ante cualquier non-2xx y `fetch`
   * rechaza si macha-backend no contesta, así que una caída del backend dejaba la única
   * puerta de entrada del producto mostrando la
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

/**
 * CU-868kkgb8f criterio 2: hay sesión pero el backend no pudo confirmar la membresía.
 *
 * No es un `error.tsx`: esta ruta está fuera de `app/(app)/` y su boundary sería el
 * `global-error`, que reemplaza la app entera. Y sobre todo, esto no es una pantalla de
 * error a secas — es la pantalla donde el usuario tiene que poder **salir**. Por eso el
 * cierre de sesión está acá y no detrás de un reintento.
 *
 * Se ofrecen las dos acciones que sí pueden cambiar algo:
 *   - reintentar (recargar esta ruta), porque una caída de Railway suele ser pasajera;
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
  kind: 'unavailable' | 'denied' | 'expired';
}) {
  return (
    <PublicScreen locale={locale}>
      <ShowcaseHeading
        eyebrow={t.home.eyebrow}
        title={t.common.routeError.title}
        subtitle={
          kind === 'denied'
            ? t.common.routeError.denied
            : kind === 'expired'
              ? t.common.routeError.expired
              : t.common.routeError.unavailable
        }
      />

      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* Un 403 no se arregla reintentando: la salida es cerrar sesión, que queda al lado.
            `<a>` y no un botón con `router.refresh()`: mantiene esta pantalla como Server
            Component, sin JS de por medio que también pueda fallar.

            Reintentar es la acción principal (tinta) y cerrar sesión la secundaria: en el
            caso normal —Railway pasajero— la primera es la que sirve.

            `expired` (401) se comporta como `denied` y NO como `unavailable`, y esa es la
            razón de que exista como caso aparte: reintentar no puede arreglar una sesión
            vencida. Ofrecer un botón que no puede funcionar hace que la persona lo apriete
            tres veces antes de encontrar la salida que sí sirve, que es volver a entrar. */}
        {kind === 'unavailable' && (
          <a href="/continue" className={showcaseCta}>
            {t.common.routeError.retry}
          </a>
        )}
        <form action={signOutAction}>
          <button
            type="submit"
            className={kind === 'unavailable' ? showcaseCtaSecondary : showcaseCta}
          >
            {t.common.signOut}
          </button>
        </form>
      </div>
    </PublicScreen>
  );
}
