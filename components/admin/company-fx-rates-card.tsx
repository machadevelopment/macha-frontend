'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import type { Dictionary } from '@/lib/i18n/dictionary';
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
 * Tasas de cambio de una empresa: la pantalla que le faltaba a `/admin/companies/:id`.
 *
 * POR QUÉ EXISTE ESTE ARCHIVO. El backend ya tenía `GET/POST
 * /admin/companies/:id/fx-rates` (CU-868kjc6h1), y cuando la ingesta marca una fila sin
 * tasa el mensaje dice literalmente "Regístrala en el panel admin (Empresa › Tasas de
 * cambio)". Esa pantalla no existía: el panel no mencionaba `fx` en ninguna parte, así
 * que la única forma de registrar una tasa era llamar la API a mano.
 *
 * Medido en producción el 2026-08-06: `fx_rates` tenía CERO filas y 617 filas de staging
 * estaban marcadas `missing_fx_rate` sobre 228 fechas distintas — todas con confianza de
 * la IA entre 0.70 y 0.85, o sea extraídas bien. Nada estaba mal en los archivos del
 * cliente: faltaba un dato nuestro. Y como la promoción no corre mientras queden filas
 * pendientes, el cliente ve su carga trabada, la vuelve a subir, y cada reintento paga
 * otra corrida de Claude completa.
 *
 * UNA SOLA FILA ARREGLA LAS 617: `findFxRate` resuelve la tasa vigente ≤ la fecha de la
 * fila, así que una tasa con fecha de vigencia anterior a la más antigua del libro cubre
 * todas las posteriores. De ahí que el estado vacío de esta tarjeta sea deliberadamente
 * ruidoso — es el estado que estaba costando dinero en silencio.
 */

interface FxRateRow {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: string;
  effectiveDate: string;
  createdAt: string;
}

interface FxRatesResponse {
  /** Moneda base de la empresa. No se elige acá: sale de `companies.base_currency`. */
  baseCurrency: string;
  /** La otra moneda del par. El backend la calcula para que la pantalla no tenga que
   *  saber que el producto solo maneja GTQ/USD. */
  quoteCurrency: string;
  rates: FxRateRow[];
}

export function CompanyFxRatesCard({
  companyId,
  labels,
  common,
}: {
  companyId: string;
  labels: Dictionary['admin']['fxRates'];
  common: Dictionary['admin']['common'];
}) {
  const { state, reload } = useResource<FxRatesResponse>(
    () => request<FxRatesResponse>(`/api/admin/companies/${companyId}/fx-rates`),
    [companyId],
  );

  const [rate, setRate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (state.status !== 'ready') return;
    setFormError(null);

    const value = Number(rate);
    if (!Number.isFinite(value) || value <= 0) {
      setFormError(labels.rateInvalid);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) {
      setFormError(labels.dateInvalid);
      return;
    }

    setSubmitting(true);
    const result = await requestJson(`/api/admin/companies/${companyId}/fx-rates`, 'POST', {
      quoteCurrency: state.data.quoteCurrency,
      rate: value,
      effectiveDate,
    });
    setSubmitting(false);

    if (!result.ok) {
      setFormError(errorMessage(result.error) ?? labels.submitError);
      return;
    }

    setRate('');
    setEffectiveDate('');
    reload();
  }

  if (state.status === 'loading') return null;
  if (state.status === 'error')
    return <AdminLoadError error={state.error} labels={common.loadError} onRetry={reload} />;

  const { baseCurrency, quoteCurrency, rates } = state.data;
  // El par es el título real de la tarjeta: sin él, "7.75" no significa nada y se puede
  // teclear invertido.
  const pair = `1 ${quoteCurrency} = ${baseCurrency}`;

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-cardh2">{labels.title}</p>
        <span className="font-mono text-eyebrow uppercase text-faint">{pair}</span>
      </div>

      {/* El estado vacío no es decorativo: es la causa de que las cargas en moneda
          extranjera se queden trabadas, y hasta ahora no se veía en ninguna pantalla. */}
      {rates.length === 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="danger">{labels.emptyBadge}</Badge>
          <p className="text-body text-danger">
            {labels.emptyWarning.replace('{quote}', quoteCurrency)}
          </p>
        </div>
      )}

      <form onSubmit={submit} className="mb-4 flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="fx-rate" className="font-mono text-eyebrow uppercase text-faint">
            {labels.rateLabel.replace('{pair}', pair)}
          </label>
          <Input
            id="fx-rate"
            type="number"
            step="any"
            min="0"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="7.75"
            className="w-32 font-mono tabular-nums"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="fx-date" className="font-mono text-eyebrow uppercase text-faint">
            {labels.dateLabel}
          </label>
          <Input
            id="fx-date"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="w-44 font-mono tabular-nums"
          />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? labels.submitting : labels.submit}
        </Button>
      </form>

      {/* Las dos cosas que un operador NO puede adivinar del formulario, y que deciden si
          la cifra queda bien: cómo se elige la tasa por fila, y que lo ya promovido no se
          recalcula (`appliesRetroactively: false` es contrato del backend, no adorno). */}
      <p className="mb-1 text-body text-faint">{labels.resolutionHint}</p>
      <p className="mb-3 text-body text-faint">{labels.retroactiveHint}</p>

      {formError && <p className="mb-3 text-body text-danger">{formError}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{labels.colEffectiveDate}</TableHead>
            <TableHead>{labels.colRate}</TableHead>
            <TableHead>{labels.colCreatedAt}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rates.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono tabular-nums">
                {formatDate(r.effectiveDate)}
              </TableCell>
              {/* Una tasa no es dinero: no lleva código de moneda propio (el par ya está
                  en la cabecera). Cuatro decimales porque la columna es numeric(18,8) y
                  redondear a dos borraría diferencias reales. */}
              <TableCell className="font-mono tabular-nums">
                {formatNumber(r.rate, 'es', 4)}
              </TableCell>
              <TableCell className="font-mono tabular-nums text-eyebrow text-faint">
                {formatDate(r.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
