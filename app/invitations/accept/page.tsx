import { getOptionalSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { AcceptInvitationPanel } from '@/components/members/accept-invitation-panel';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { MachaMark } from '@/components/ui/macha-mark';
import {
  ShowcaseFrame,
  ShowcaseHeading,
  showcaseCta,
  showcaseCtaSecondary,
} from '@/components/ui/showcase';
import type { PendingInvitation } from '@/lib/api/invitations';
import type { Locale } from '@/lib/i18n/config';

/**
 * CU-868kh8pwv. El token llega por query string porque viene de un enlace de correo.
 *
 * ═══ CU-868ktkq8r: ESTA RUTA DEJÓ DE EXIGIR SESIÓN, Y SALIÓ DE `app/(app)/` ═══
 *
 * Antes vivía dentro del grupo `(app)` y `middleware.ts` le exigía sesión. Eso se
 * consideró deliberado —"quien abre el enlace sin sesión pasa por AuthKit primero y
 * vuelve acá con el token intacto"— y funciona para quien YA tiene cuenta. Para el
 * invitado NUEVO, que es el caso normal de esta pantalla, era el bug que reportó QA:
 * clic en el correo y, sin una sola palabra de por medio, la hosted UI genérica de
 * WorkOS pidiendo nombre y apellido. La captura del ticket es exactamente esa pantalla.
 * Nada dice que hay una invitación, nada dice a qué empresa, y el único camino visible
 * después de crear la cuenta es el alta — o sea, crear una empresa propia.
 *
 * Ahora la ruta es pública y explica el trato ANTES de mandar a nadie a autenticarse:
 * te invitaron, esto es unirse a una empresa que ya existe, entra con el correo al que
 * te llegó la invitación. El `?token=` viaja en `returnTo`, así que el viaje de ida y
 * vuelta por AuthKit lo conserva.
 *
 * No se muestra el nombre de la empresa en la rama SIN sesión, y es a propósito: eso
 * exigiría un endpoint público que traduzca token → empresa, o sea un oráculo para
 * probar tokens contra él. Con sesión sí aparece, porque ahí la autoridad es el correo
 * verificado de la cuenta y no el enlace (ver `lib/api/invitations.ts`).
 *
 * CU-868knx0vh — ZONA DE VITRINA (design guide §2.7). Es una de las tres puertas de
 * entrada al producto —quien llega acá viene de un correo, muchas veces sin conocer
 * Macha— así que recibe el mismo marco que `/` y el registro: atmósfera del Insight
 * Point, sello con el isotipo y titular en `display`. Al salir del grupo `(app)` el
 * marco pasa a ser el de `/`: wordmark, selector de idioma y `min-h-dvh`, porque ya no
 * hay shell debajo que ponga esas dos cosas ni que aporte altura.
 */
export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const locale = getLocale();
  const t = getDictionary(locale);
  const token = searchParams.token ?? '';

  const { user, accessToken } = await getOptionalSession();

  if (!user || !accessToken) {
    // El destino de vuelta conserva el token. `destinoSeguro` (lib/auth/return-to.ts)
    // lo valida del otro lado; acá se arma relativo a la raíz, que es la única forma
    // que esa validación acepta.
    const volverA = token
      ? `/invitations/accept?token=${encodeURIComponent(token)}`
      : '/invitations/accept';
    const login = (extra?: string) =>
      `/login?returnTo=${encodeURIComponent(volverA)}${extra ?? ''}`;

    return (
      <InvitationScreen locale={locale}>
        <ShowcaseHeading
          eyebrow={t.members.accept.eyebrow}
          title={t.members.accept.signedOutTitle}
          subtitle={t.members.accept.signedOutSubtitle}
        />
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* `screenHint=sign-up` porque el invitado típico NO tiene cuenta: sin él la
              hosted UI abre en "Sign in" y hay que descubrir el enlace de registro. Ver
              app/login/route.ts. */}
          <a href={login('&screenHint=sign-up')} className={showcaseCta}>
            {t.members.accept.signedOutCreateAccount}
          </a>
          <a href={login()} className={showcaseCtaSecondary}>
            {t.members.accept.signedOutSignIn}
          </a>
        </div>
        <p className="max-w-[52ch] text-center text-caption text-muted-foreground">
          {t.members.accept.emailHint}
        </p>
      </InvitationScreen>
    );
  }

  /*
   * Las invitaciones vivas dirigidas al correo de ESTA sesión. Es la red que atrapa al
   * invitado que llegó hasta acá sin `?token=` — el que reabrió la app después de
   * registrarse, o el que perdió la query en algún tropiezo del viaje por AuthKit.
   * Sin esto, ese usuario no tenía ninguna forma de unirse: solo la de crear empresa.
   */
  let invitations: PendingInvitation[] = [];
  let backendUnavailable = false;
  try {
    const res = await apiFetch<{ invitations: PendingInvitation[] }>('/invitations/pending', {
      accessToken,
    });
    invitations = res.invitations;
  } catch {
    // No se cae la pantalla: con token en la URL todavía se puede aceptar, y sin él el
    // panel muestra el mensaje de que no se pudo consultar.
    backendUnavailable = true;
  }

  return (
    <InvitationScreen locale={locale}>
      <ShowcaseHeading
        eyebrow={t.members.accept.eyebrow}
        title={t.members.accept.title}
        subtitle={t.members.accept.subtitle}
      />
      <AcceptInvitationPanel
        token={token}
        invitations={invitations}
        backendUnavailable={backendUnavailable}
        labels={t.members.accept}
        roles={t.members.role}
      />
    </InvitationScreen>
  );
}

/**
 * El marco de la pantalla, igual al de `/` y por la misma razón: fuera del grupo `(app)`
 * no hay shell, así que el wordmark y el selector de idioma tienen que estar acá. El
 * idioma importa especialmente en esta ruta — quien llega puede no haber entrado nunca al
 * producto y su idioma todavía no lo decide ninguna empresa.
 */
function InvitationScreen({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <ShowcaseFrame className="min-h-dvh">
      <main
        data-density="comfortable"
        className="mx-auto flex min-h-dvh max-w-[720px] flex-col p-[var(--density-main-p)]"
      >
        <div className="flex items-center justify-between">
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
