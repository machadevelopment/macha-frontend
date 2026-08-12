import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { AcceptInvitationPanel } from '@/components/members/accept-invitation-panel';
import { ShowcaseFrame, ShowcaseHeading } from '@/components/ui/showcase';

/**
 * CU-868kh8pwv. El token llega por query string porque viene de un enlace de correo.
 *
 * `middleware.ts` ya exige sesión, y eso es deliberado y no un efecto colateral: quien
 * abre el enlace sin sesión pasa por AuthKit primero y vuelve acá con el token intacto.
 * La aceptación EXIGE identidad — el backend compara el correo del invitado con el de la
 * cuenta que acepta, que es lo que impide que un token reenviado sirva para meter a
 * cualquiera en la empresa.
 *
 * CU-868knx0vh — ZONA DE VITRINA (design guide §2.7), y no tenía NINGUNA marca: una
 * tarjeta suelta de 448px con un título de 15px arriba a la izquierda. Es una de las tres
 * puertas de entrada al producto —quien llega acá viene de un correo, muchas veces sin
 * conocer Macha— así que recibe el mismo marco que `/` y el registro: atmósfera del
 * Insight Point, sello con el isotipo y titular en `display`.
 *
 * El título y la bajada suben de la tarjeta a la cabecera. La tarjeta se queda con lo que
 * de verdad es acción —el botón y el error—, que es lo que hace que la pantalla tenga un
 * solo foco.
 */
export default function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    /*
     * Sin `min-h-dvh`, a diferencia de `/` o del registro: esta ruta SÍ cuelga de
     * `app/(app)/layout.tsx`, o sea que ya vive dentro del shell (sidebar en escritorio,
     * topbar en móvil). Estirarla a la altura de la ventana metería una barra de scroll
     * por la altura del propio shell. El aire lo pone el padding vertical.
     */
    <ShowcaseFrame className="mx-auto max-w-[720px]">
      <main
        data-density="comfortable"
        className="mx-auto flex max-w-[560px] flex-col gap-6 p-[var(--density-main-p)] py-14"
      >
        <ShowcaseHeading
          eyebrow={t.members.accept.eyebrow}
          title={t.members.accept.title}
          subtitle={t.members.accept.subtitle}
        />
        <AcceptInvitationPanel token={searchParams.token ?? ''} labels={t.members.accept} />
      </main>
    </ShowcaseFrame>
  );
}
