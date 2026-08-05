'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { requestJson, errorMessage } from '@/lib/api/browser';
import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * CU-868kh8pwv — aceptación de una invitación de equipo.
 *
 * Requiere un clic explícito en vez de aceptar sola al cargar. Un enlace de correo lo
 * abre cualquier cosa —el escáner de seguridad del proveedor, una previsualización de
 * mensajería— y un GET que muta estado se consume solo antes de que la persona lo vea.
 * El token es de un solo uso: consumido por un robot, el invitado real se queda fuera.
 */
export function AcceptInvitationPanel({
  token,
  labels,
}: {
  token: string;
  labels: Dictionary['members']['accept'];
}) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <Card>
        <p className="text-body text-danger">{labels.missingToken}</p>
      </Card>
    );
  }

  async function accept() {
    setState('sending');
    setError(null);
    const result = await requestJson<{ companyId: string }>('/api/invitations/accept', 'POST', {
      token,
    });
    if (!result.ok) {
      // El backend explica el motivo (vencida, ya usada, de otra persona) y ese texto es
      // lo accionable; el genérico solo cubre un fallo de red.
      setError(errorMessage(result.error) ?? labels.genericError);
      setState('idle');
      return;
    }
    setState('done');
    // Recarga completa y no `router.push`: la membresía recién creada cambia lo que
    // devuelve `/me/memberships`, y el shell la lee en el servidor.
    window.location.href = '/dashboard';
  }

  return (
    <Card>
      <p className="mb-1 text-cardh2">{labels.title}</p>
      <p className="mb-4 text-body text-muted-foreground">{labels.subtitle}</p>
      {error && <p className="mb-3 text-body text-danger">{error}</p>}
      <Button onClick={() => void accept()} disabled={state !== 'idle'}>
        {state === 'done' ? labels.accepted : labels.action}
      </Button>
    </Card>
  );
}
