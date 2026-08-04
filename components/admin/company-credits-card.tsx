'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminLoadError } from '@/components/admin/admin-load-error';
import { request, requestJson, errorMessage } from '@/lib/api/browser';
import { useResource } from '@/lib/api/use-resource';
import { formatDate, formatNumber } from '@/lib/format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * CU-868kjc7g5 / US-19: saldo, historial y abono de créditos de una empresa.
 *
 * VA EN EL DETALLE DE EMPRESA, no en una `/admin/credits` suelta (el ticket admite las
 * dos). Los créditos son por empresa y esta pantalla ya es donde el staff toca lo que es
 * por empresa —roles y umbrales de alerta—; una ruta aparte obligaría a elegir la
 * empresa otra vez y a mantener un segundo selector.
 *
 * NO HAY EDITAR NI BORRAR, Y NO ES UN OLVIDO. `credit_transactions` es append-only
 * (REVOKE UPDATE, DELETE en la migración 0010): corregir un abono equivocado es un
 * movimiento NEGATIVO con su propia razón, y por eso el formulario acepta signo. La
 * tabla de abajo muestra las dos filas, que es justamente el registro que se quiere.
 */

interface CreditMovement {
  id: string;
  delta: number;
  reason: 'monthly_allotment' | 'top_up' | 'consumption';
  actionKind: string | null;
  note: string | null;
  refId: string | null;
  createdAt: string;
}

interface CreditsResponse {
  companyId: string;
  balance: number;
  movements: CreditMovement[];
}

// El backend usa los valores del enum del ledger; acá se traducen para que el operador
// no tenga que saber el esquema. `consumption` incluye su `action_kind` en la columna
// de al lado, que es lo que dice QUÉ lo consumió.
const REASON_LABEL: Record<CreditMovement['reason'], string> = {
  monthly_allotment: 'asignación',
  top_up: 'abono manual',
  consumption: 'consumo',
};

export function CompanyCreditsCard({ companyId }: { companyId: string }) {
  const { state, reload } = useResource<CreditsResponse>(
    () => request<CreditsResponse>(`/api/admin/companies/${companyId}/credits`),
    [companyId],
  );

  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const amount = Number(delta);
    if (!Number.isInteger(amount) || amount === 0) {
      setFormError('El movimiento debe ser un número entero distinto de 0.');
      return;
    }
    // El backend también lo exige (es la garantía real); acá se adelanta para no gastar
    // un round-trip en el error más probable.
    if (note.trim().length < 3) {
      setFormError('Escribe la razón del movimiento.');
      return;
    }

    setSubmitting(true);
    const result = await requestJson(`/api/admin/companies/${companyId}/credits`, 'POST', {
      delta: amount,
      note: note.trim(),
    });
    setSubmitting(false);

    if (!result.ok) {
      // El mensaje del backend se muestra tal cual cuando lo hay: dice exactamente qué
      // corregir (razón vacía, movimiento en 0) o que falta rol super_admin.
      setFormError(errorMessage(result.error) ?? 'No se pudo registrar el movimiento.');
      return;
    }

    setDelta('');
    setNote('');
    reload();
  }

  if (state.status === 'loading') return null;
  if (state.status === 'error') return <AdminLoadError error={state.error} onRetry={reload} />;

  const { balance, movements } = state.data;

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-cardh2">Créditos</p>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-eyebrow uppercase text-faint">SALDO</span>
          {/* Créditos no son dinero: no llevan código de moneda (no son GTQ ni USD).
              Sí son un número que se lee, así que pasa por el formateo centralizado y
              por la regla mono, como el resto de las cifras. */}
          <span className="font-mono tabular-nums text-h2">{formatNumber(balance)}</span>
          {balance <= 0 && <Badge variant="danger">sin saldo</Badge>}
        </div>
      </div>

      <form onSubmit={submit} className="mb-4 flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="credit-delta" className="font-mono text-eyebrow uppercase text-faint">
            MOVIMIENTO
          </label>
          <Input
            id="credit-delta"
            type="number"
            step="1"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            placeholder="500"
            className="w-28 font-mono tabular-nums"
          />
        </div>
        <div className="flex min-w-64 flex-1 flex-col gap-1">
          <label htmlFor="credit-note" className="font-mono text-eyebrow uppercase text-faint">
            RAZÓN (OBLIGATORIA)
          </label>
          <Input
            id="credit-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Compensación por carga fallida del 3 de agosto"
            maxLength={500}
          />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Registrando…' : 'Registrar'}
        </Button>
      </form>

      {/* El signo se explica acá y no en un tooltip: es la única forma de deshacer, y sin
          decirlo un operador buscaría un botón de borrar que no existe. */}
      <p className="mb-3 text-body text-faint">
        Un movimiento negativo corrige uno anterior — el ledger no se edita ni se borra, se
        compensa. Ambas filas quedan en el historial.
      </p>

      {formError && <p className="mb-3 text-body text-danger">{formError}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Movimiento</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Razón</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="font-mono tabular-nums text-eyebrow text-faint">
                {formatDate(m.createdAt)}
              </TableCell>
              <TableCell
                className={`font-mono tabular-nums ${m.delta < 0 ? 'text-danger' : 'text-success'}`}
              >
                {m.delta > 0 ? '+' : ''}
                {formatNumber(m.delta)}
              </TableCell>
              <TableCell className="font-mono text-eyebrow uppercase text-faint">
                {REASON_LABEL[m.reason]}
                {m.actionKind ? ` · ${m.actionKind}` : ''}
              </TableCell>
              {/* El consumo no lleva razón escrita: su explicación es el tipo + la acción
                  de la columna anterior. Un guion es más honesto que una celda vacía. */}
              <TableCell>{m.note ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
