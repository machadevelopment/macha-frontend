import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { AcceptInvitationPanel } from '@/components/members/accept-invitation-panel';

/**
 * CU-868kh8pwv. El token llega por query string porque viene de un enlace de correo.
 *
 * `middleware.ts` ya exige sesión, y eso es deliberado y no un efecto colateral: quien
 * abre el enlace sin sesión pasa por AuthKit primero y vuelve acá con el token intacto.
 * La aceptación EXIGE identidad — el backend compara el correo del invitado con el de la
 * cuenta que acepta, que es lo que impide que un token reenviado sirva para meter a
 * cualquiera en la empresa.
 */
export default function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <main data-density="comfortable" className="mx-auto max-w-md p-[var(--density-main-p)]">
      <AcceptInvitationPanel token={searchParams.token ?? ''} labels={t.members.accept} />
    </main>
  );
}
