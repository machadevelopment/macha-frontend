'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadError } from '@/components/ui/load-error';
import { request, requestJson } from '@/lib/api/browser';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { RequestError } from '@/lib/api/browser';
import type { Member, Invitation, AssignableRole } from '@/lib/api/members';

/**
 * CU-868kh8pwv — equipo de la empresa: invitar, revocar, cambiar rol y quitar.
 *
 * Solo el owner llega hasta aquí (capacidad `manage_members`/`change_roles`), pero la
 * puerta real es el backend: esta pantalla no decide permisos, los refleja. Un 403 se
 * muestra tal cual en vez de esconder el botón y fingir que la acción no existe.
 *
 * Lo que la UI NO ofrece, porque el backend tampoco: promover a `owner`. Transferir la
 * propiedad es una acción explícita y aparte, nunca una edición de rol en una lista.
 */
export function MembersPanel({
  labels,
  common,
}: {
  labels: Dictionary['members'];
  /** CU-868kkgb3c: textos compartidos del estado de fallo, para no reinventarlos acá. */
  common: Dictionary['common'];
}) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [loadFailed, setLoadFailed] = useState<RequestError | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AssignableRole>('member');
  const [busy, setBusy] = useState(false);
  /** Mensaje del backend tal cual: las invariantes explican POR QUÉ se rechazó. */
  const [notice, setNotice] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);

  const load = useCallback(async () => {
    const [m, i] = await Promise.all([
      request<Member[]>('/api/members'),
      request<Invitation[]>('/api/members/invitations'),
    ]);
    if (!m.ok) {
      setLoadFailed(m.error);
      return;
    }
    setLoadFailed(null);
    setMembers(m.data);
    if (i.ok) setInvitations(i.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Toda mutación pasa por aquí para que el mensaje de error del backend llegue al
   * usuario sin reescribirse. Los rechazos de este módulo son invariantes de negocio
   * ("la empresa quedaría sin owner", "esa persona ya es miembro"), y traducirlos a un
   * "algo salió mal" genérico dejaría al owner sin saber qué hacer.
   */
  async function mutate(fn: () => Promise<{ ok: boolean; error?: { body?: unknown } }>) {
    setBusy(true);
    setNotice(null);
    try {
      const result = await fn();
      if (!result.ok) {
        const body = result.error?.body as { error?: string } | undefined;
        setNotice({ kind: 'error', text: body?.error ?? labels.genericError });
        return false;
      }
      await load();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const ok = await mutate(() =>
      requestJson<{ id: string }>('/api/members/invitations', 'POST', { email, role }),
    );
    if (ok) {
      setEmail('');
      setNotice({ kind: 'ok', text: labels.inviteSent });
    }
  }

  if (loadFailed) return <LoadError error={loadFailed} labels={common.loadError} onRetry={load} />;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="mb-1 text-cardh2">{labels.inviteTitle}</p>
        <p className="mb-3 text-body text-muted-foreground">{labels.inviteHint}</p>
        <form onSubmit={invite} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <Field
              id="invite-email"
              type="email"
              required
              label={labels.emailLabel}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={labels.emailPlaceholder}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">{labels.roleLabel}</Label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as AssignableRole)}
              className="rounded-md border border-border bg-surface px-3 py-2 text-body"
            >
              <option value="member">{labels.role.member}</option>
              <option value="admin">{labels.role.admin}</option>
            </select>
          </div>
          <Button type="submit" disabled={busy}>
            {labels.inviteAction}
          </Button>
        </form>
        {notice && (
          <p
            className={`mt-3 text-body ${notice.kind === 'error' ? 'text-danger' : 'text-success'}`}
          >
            {notice.text}
          </p>
        )}
      </Card>

      <Card>
        <p className="mb-3 text-cardh2">{labels.membersTitle}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="text-left font-mono text-eyebrow uppercase text-faint">
                <th className="pb-2">{labels.colPerson}</th>
                <th className="pb-2">{labels.colRole}</th>
                <th className="pb-2">{labels.colStatus}</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {(members ?? []).map((m) => (
                <tr key={m.userId} className="border-t border-border">
                  <td className="py-2">
                    <span className="block">{m.name ?? m.email}</span>
                    <span className="font-mono text-eyebrow text-faint">{m.email}</span>
                  </td>
                  <td className="py-2">
                    {/* El owner no se edita desde acá: cambiarlo es transferir la
                        propiedad, que es una acción explícita aparte. */}
                    {m.role === 'owner' ? (
                      <Badge variant="neutral">{labels.role.owner}</Badge>
                    ) : (
                      <select
                        value={m.role}
                        disabled={busy || m.status !== 'active'}
                        onChange={(e) =>
                          void mutate(() =>
                            requestJson(`/api/members/${m.userId}`, 'PATCH', {
                              role: e.target.value as AssignableRole,
                            }),
                          )
                        }
                        className="rounded-md border border-border bg-surface px-2 py-1 text-body"
                      >
                        <option value="member">{labels.role.member}</option>
                        <option value="admin">{labels.role.admin}</option>
                      </select>
                    )}
                  </td>
                  <td className="py-2">
                    <Badge variant={m.status === 'active' ? 'success' : 'neutral'}>
                      {labels.status[m.status]}
                    </Badge>
                  </td>
                  <td className="py-2 text-right">
                    {m.role !== 'owner' && m.status === 'active' && (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          void mutate(() => requestJson(`/api/members/${m.userId}`, 'DELETE'))
                        }
                      >
                        {labels.removeAction}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <p className="mb-3 text-cardh2">{labels.pendingTitle}</p>
        {invitations && invitations.length === 0 ? (
          <p className="text-body text-muted-foreground">{labels.pendingEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(invitations ?? []).map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between border-t border-border py-2 first:border-t-0"
              >
                <span>
                  <span className="font-mono text-body">{inv.email}</span>
                  <Badge variant="neutral" className="ml-2">
                    {labels.role[inv.role]}
                  </Badge>
                </span>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    void mutate(() => requestJson(`/api/members/invitations/${inv.id}`, 'DELETE'))
                  }
                >
                  {labels.revokeAction}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
