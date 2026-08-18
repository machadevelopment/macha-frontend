'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { requestJson, errorMessage } from '@/lib/api/browser';
import { setActiveCompany } from '@/app/actions/set-active-company';
import { invitationRejectionKey, type PendingInvitation } from '@/lib/api/invitations';
import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * CU-868kh8pwv — aceptación de una invitación de equipo.
 *
 * Requiere un clic explícito en vez de aceptar sola al cargar. Un enlace de correo lo
 * abre cualquier cosa —el escáner de seguridad del proveedor, una previsualización de
 * mensajería— y un GET que muta estado se consume solo antes de que la persona lo vea.
 * El token es de un solo uso: consumido por un robot, el invitado real se queda fuera.
 *
 * ═══ CU-868ktkq8r: DOS FUENTES, Y LA LISTA MANDA ═══
 *
 * El panel ya no depende de que la URL traiga `?token=`. La página le pasa además las
 * invitaciones vivas dirigidas al correo de la sesión (`GET /invitations/pending`), y esa
 * lista es la vía PREFERENTE por tres razones concretas:
 *
 *   · sobrevive al viaje por AuthKit. El token viaja en `returnTo` y normalmente vuelve,
 *     pero el invitado nuevo hace crear-cuenta + verificar-correo en el medio, y ahí se
 *     pierde de formas que no controlamos (otra pestaña, otro navegador, el enlace
 *     reabierto desde el correo). Sin lista, ese usuario se quedaba sin ninguna puerta
 *     que no fuera crear una empresa propia;
 *   · dice el NOMBRE de la empresa y el rol antes de aceptar. "Aceptar invitación" a
 *     secas no le dice a nadie a qué está entrando;
 *   · cubre el caso de varias invitaciones a la vez, que con un solo token no existía.
 *
 * El token no se retira: es lo único que funciona cuando la invitación se mandó a un
 * correo distinto del de la cuenta con la que la persona entró. Ahí la lista viene vacía
 * y el backend, con el token, responde el rechazo exacto ("Esta invitación no corresponde
 * a tu cuenta") en vez de un silencio.
 */
export function AcceptInvitationPanel({
  token,
  invitations,
  backendUnavailable,
  labels,
  roles,
}: {
  token: string;
  invitations: PendingInvitation[];
  backendUnavailable: boolean;
  labels: Dictionary['members']['accept'];
  roles: Dictionary['members']['role'];
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  /**
   * Nada que aceptar y nada con qué intentarlo. Es el estado que antes NO existía y salía
   * como "el enlace no trae token", un mensaje que solo tiene sentido para quien vino del
   * correo — el que llegó por su cuenta leía un reproche sobre un enlace que no usó.
   */
  if (invitations.length === 0 && !token) {
    return (
      <Card className="w-full">
        {/* Tripleta texto+fondo+borde (design guide §1.3): el color de estado nunca va solo
            como tinta sobre la tarjeta. */}
        <p
          role="alert"
          className="rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-body text-danger"
        >
          {backendUnavailable ? labels.unavailable : labels.noPending}
        </p>
      </Card>
    );
  }

  async function accept(payload: { token: string } | { invitationId: string }) {
    setState('sending');
    setError(null);
    const result = await requestJson<{ companyId: string }>(
      '/api/invitations/accept',
      'POST',
      payload,
    );
    if (!result.ok) {
      /*
       * El backend distingue tres rechazos —vencida, ya usada/inexistente, de otra
       * persona— y cuál sea es lo accionable: pedir otra invitación, o entrar con el
       * correo correcto. Antes se mostraba su texto crudo, que es español quemado en el
       * backend; ahora se traduce por el `reason` y ese texto queda de red para un motivo
       * que este cliente todavía no conozca (CU-868ktkq8r).
       */
      const clave = invitationRejectionKey(
        (result.error.body as { reason?: unknown } | undefined)?.reason,
      );
      setError(
        (clave && labels.rejection[clave]) ?? errorMessage(result.error) ?? labels.genericError,
      );
      setState('idle');
      return;
    }
    /*
     * ═══ CU-868kt55w3: LA EMPRESA RECIÉN ACEPTADA PASA A SER LA ACTIVA ═══
     *
     * La membresía SÍ se creaba —el backend la inserta con el rol de la invitación, antes
     * de marcar el token como usado—, pero nadie tocaba la cookie de empresa activa. El
     * resultado depende de cuántas empresas tenga la persona:
     *
     *   · con UNA sola, `tenantDerive` la resuelve solo y todo se ve bien;
     *   · con DOS o más —el caso del contador que trabaja con varios clientes, o de quien
     *     ya tenía su propia empresa— la cookie vieja manda, y aterriza en la empresa
     *     ANTERIOR. Ve su dashboard de siempre, ninguna señal de la invitación, y concluye
     *     que no se unió.
     *
     * Se fija ANTES de navegar y se espera: `window.location.href` provoca una petición al
     * servidor, y si la cookie todavía no está escrita esa petición sale con la anterior.
     */
    await setActiveCompany(result.data.companyId);

    setState('done');
    // Recarga completa y no `router.push`: la membresía recién creada cambia lo que
    // devuelve `/me/memberships`, y el shell la lee en el servidor.
    window.location.href = '/dashboard';
  }

  return (
    <Card className="flex w-full flex-col gap-3">
      {error && (
        <p
          role="alert"
          className="w-full rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-body text-danger"
        >
          {error}
        </p>
      )}

      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="flex flex-col items-center justify-between gap-3 sm:flex-row sm:text-left"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-body font-medium text-foreground">{inv.companyName}</span>
            <span className="text-caption text-muted-foreground">
              {labels.asRole.replace('{role}', roles[inv.role])}
            </span>
          </div>
          <Button
            onClick={() => void accept({ invitationId: inv.id })}
            disabled={state !== 'idle'}
            className="w-full sm:w-auto"
          >
            {state === 'done' ? labels.accepted : labels.join}
          </Button>
        </div>
      ))}

      {/* Sin lista pero con token: la invitación es para otro correo, ya venció o ya se
          usó. Se manda igual, porque es la única vía por la que el backend puede decir
          CUÁL de las tres — sin token la pantalla solo podría encogerse de hombros. */}
      {invitations.length === 0 && token && (
        <div className="flex flex-col items-center gap-3 text-center">
          <Button
            onClick={() => void accept({ token })}
            disabled={state !== 'idle'}
            className="w-full sm:w-auto"
          >
            {state === 'done' ? labels.accepted : labels.action}
          </Button>
        </div>
      )}
    </Card>
  );
}
