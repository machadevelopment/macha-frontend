'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
            <Select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as AssignableRole)}
            >
              <option value="member">{labels.role.member}</option>
              <option value="admin">{labels.role.admin}</option>
            </Select>
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
        {/*
          ═══ CU-868ku9rpy · LA TABLA DEL SISTEMA, NO UNA ESCRITA A MANO ═══

          Esto era `<table>`, `<thead>`, `<th className="pb-2">` y `<tr className="border-t">`
          crudos: reinventaba lo que `components/ui/table.tsx` ya define —relleno por token de
          densidad, encabezado en mono con tracking, borde entre filas, `overflow-x-auto` con
          `whitespace-nowrap` para que desborde en móvil en vez de comprimirse (CU-868khvzbd).

          El resultado no era feo por sí solo, era DISTINTO: el relleno de celda no seguía la
          densidad de la app, así que esta tabla y la de Ventas por producto tenían aire
          diferente en la misma sesión. Y el día que el token de densidad cambie, esta se
          queda atrás sin que nada falle — que es exactamente cómo se acumulan estas
          diferencias.
        */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labels.colPerson}</TableHead>
              <TableHead>{labels.colRole}</TableHead>
              <TableHead>{labels.colStatus}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(members ?? []).map((m) => (
              <TableRow key={m.userId}>
                <TableCell>
                  <span className="block">{m.name ?? m.email}</span>
                  <span className="font-mono text-eyebrow text-faint">{m.email}</span>
                </TableCell>
                <TableCell>
                  {/* El owner no se edita desde acá: cambiarlo es transferir la
                        propiedad, que es una acción explícita aparte. */}
                  {m.role === 'owner' ? (
                    <Badge variant="neutral">{labels.role.owner}</Badge>
                  ) : (
                    <Select
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
                    </Select>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={m.status === 'active' ? 'success' : 'neutral'}>
                    {labels.status[m.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
