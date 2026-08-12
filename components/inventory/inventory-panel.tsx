'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Boxes, DollarSign, Pencil, Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadError } from '@/components/ui/load-error';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { request, requestJson, type RequestError } from '@/lib/api/browser';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';
import type {
  InventoryItem,
  InventoryMovementsResponse,
  InventoryResponse,
  MovementType,
} from '@/lib/api/dashboard';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * Inventario — existencias, alta/edición/baja de SKUs e historial de movimientos.
 *
 * LA REGLA QUE ORDENA ESTA PANTALLA: el formulario de edición NO tiene campo de
 * existencia. Mover stock es registrar un movimiento, y por eso hay dos diálogos distintos
 * en lugar de uno con todos los campos. No es una limitación heredada del backend: es lo
 * que hace que el historial explique siempre por qué cambió la existencia. Un formulario
 * que dejara corregir el número a mano crearía cambios sin causa registrada, y la primera
 * vez que falte mercadería el historial no serviría para averiguar qué pasó.
 *
 * Solo el alta admite existencia inicial, y el backend la registra como movimiento de
 * apertura — así el saldo cuadra con el ledger desde la primera fila.
 *
 * Los errores del backend se muestran tal cual ("Ya existe un artículo con el SKU
 * CAFE-500"): son instrucciones de qué corregir, y sustituirlos por un genérico dejaría a
 * quien está capturando sin saber qué falló.
 */
export function InventoryPanel({
  locale,
  labels,
  common,
}: {
  locale: Locale;
  labels: Dictionary['inventory'];
  common: Dictionary['common'];
}) {
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [movimientos, setMovimientos] = useState<InventoryMovementsResponse | null>(null);
  const [loadFailed, setLoadFailed] = useState<RequestError | null>(null);
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState<
    { mode: 'create' } | { mode: 'edit'; item: InventoryItem } | null
  >(null);
  const [movOpen, setMovOpen] = useState<InventoryItem | null>(null);

  const cargar = useCallback(async () => {
    setLoadFailed(null);
    const [inv, movs] = await Promise.all([
      request<InventoryResponse>('/api/inventory'),
      request<InventoryMovementsResponse>('/api/inventory/movements?limit=50'),
    ]);
    if (!inv.ok) {
      setLoadFailed(inv.error);
      return;
    }
    setData(inv.data);
    // El historial es secundario: si falla, la lista de existencias sigue sirviendo.
    setMovimientos(movs.ok ? movs.data : null);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /** Toda mutación pasa por aquí para que el mensaje del backend llegue sin reescribirse. */
  async function mutar(fn: () => Promise<{ ok: boolean; error?: { body?: unknown } }>) {
    setBusy(true);
    setAviso(null);
    try {
      const resultado = await fn();
      if (!resultado.ok) {
        const body = resultado.error?.body as { error?: string } | undefined;
        setAviso(body?.error ?? labels.genericError);
        return false;
      }
      await cargar();
      return true;
    } finally {
      setBusy(false);
    }
  }

  if (loadFailed) {
    return <LoadError error={loadFailed} labels={common.loadError} onRetry={cargar} />;
  }

  const moneda = (data?.baseCurrency ?? 'GTQ') as 'GTQ' | 'USD';
  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <p className="flex items-center justify-between font-mono text-eyebrow uppercase text-faint">
            {labels.stockValue}
            <DollarSign className="h-3.5 w-3.5" strokeWidth={1.7} />
          </p>
          <p className="mt-2 text-kpi tabular-nums">
            {formatMoney(data?.totalStockValueBase ?? 0, moneda, locale)}
          </p>
        </Card>
        <Card>
          <p className="flex items-center justify-between font-mono text-eyebrow uppercase text-faint">
            {labels.skuCount}
            <Boxes className="h-3.5 w-3.5" strokeWidth={1.7} />
          </p>
          <p className="mt-2 text-kpi tabular-nums">{formatNumber(items.length, locale)}</p>
        </Card>
        <Card>
          <p className="flex items-center justify-between font-mono text-eyebrow uppercase text-faint">
            {labels.belowReorder}
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.7} />
          </p>
          <p
            className={cn(
              'mt-2 text-kpi tabular-nums',
              (data?.belowReorderCount ?? 0) > 0 && 'text-danger',
            )}
          >
            {formatNumber(data?.belowReorderCount ?? 0, locale)}
          </p>
        </Card>
      </div>

      {aviso && (
        <div
          role="alert"
          className="rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-body text-danger"
        >
          {aviso}
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{labels.itemsTitle}</CardTitle>
          <Button type="button" onClick={() => setFormOpen({ mode: 'create' })} disabled={busy}>
            <Plus className="h-4 w-4" strokeWidth={1.7} />
            {labels.addItem}
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="mt-3">
            <p className="text-body text-muted-foreground">{labels.empty}</p>
            <p className="mt-1 text-body text-faint">{labels.emptyHint}</p>
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{labels.colSku}</TableHead>
                  <TableHead>{labels.colName}</TableHead>
                  <TableHead>{labels.colLocation}</TableHead>
                  <TableHead className="text-right">{labels.colOnHand}</TableHead>
                  <TableHead className="text-right">{labels.colReorder}</TableHead>
                  <TableHead className="text-right">{labels.colUnitCost}</TableHead>
                  <TableHead className="text-right">{labels.colValue}</TableHead>
                  <TableHead>{labels.colSupplier}</TableHead>
                  <TableHead>{labels.colLastRestock}</TableHead>
                  <TableHead className="text-right">{labels.colActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="tabular-nums">{item.sku}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">{item.location ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="inline-flex items-center gap-1.5">
                        {formatNumber(item.quantityOnHand, locale)}
                        {item.belowReorderPoint && (
                          <Badge variant="danger">{labels.belowReorder}</Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatNumber(item.reorderPoint, locale)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(
                        item.unitCostOriginal,
                        item.unitCostCurrency as 'GTQ' | 'USD',
                        locale,
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(item.stockValueBase, moneda, locale)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.supplier ?? '—'}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {item.lastRestockDate ? formatDate(item.lastRestockDate, locale) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => setMovOpen(item)}
                        >
                          {labels.recordMovement}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={labels.editItem}
                          disabled={busy}
                          onClick={() => setFormOpen({ mode: 'edit', item })}
                        >
                          <Pencil className="h-4 w-4" strokeWidth={1.7} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={labels.discontinue}
                          disabled={busy}
                          onClick={() => {
                            if (!window.confirm(labels.discontinueConfirm)) return;
                            void mutar(() => requestJson(`/api/inventory/${item.id}`, 'DELETE'));
                          }}
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.7} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{labels.movementsTitle}</CardTitle>
        </CardHeader>
        {(movimientos?.movements.length ?? 0) === 0 ? (
          <p className="mt-3 text-body text-muted-foreground">{labels.movementsEmpty}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{labels.colWhen}</TableHead>
                  <TableHead>{labels.colItem}</TableHead>
                  <TableHead>{labels.colMovement}</TableHead>
                  <TableHead className="text-right">{labels.colQuantity}</TableHead>
                  <TableHead className="text-right">{labels.colAfter}</TableHead>
                  <TableHead>{labels.colReason}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos!.movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatDate(m.occurredAt, locale)}
                    </TableCell>
                    <TableCell className="font-medium">{m.itemName}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.movementType === 'in'
                            ? 'success'
                            : m.movementType === 'out'
                              ? 'danger'
                              : 'neutral'
                        }
                      >
                        {labels.movement[m.movementType]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {/* El signo lo pone el tipo, no el número guardado (que es positivo
                          salvo en ajustes). Mostrarlo aquí evita leer "salida 30" como una
                          suma. */}
                      {m.movementType === 'out' ? '−' : m.movementType === 'in' ? '+' : ''}
                      {formatNumber(Math.abs(m.quantity), locale)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatNumber(m.quantityAfter, locale)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.reason ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {formOpen && (
        <ItemDialog
          key={formOpen.mode === 'edit' ? formOpen.item.id : 'create'}
          state={formOpen}
          labels={labels}
          common={common}
          busy={busy}
          onClose={() => setFormOpen(null)}
          onSubmit={async (payload) => {
            const ok = await mutar(() =>
              formOpen.mode === 'create'
                ? requestJson<{ id: string }>('/api/inventory', 'POST', payload)
                : requestJson(`/api/inventory/${formOpen.item.id}`, 'PATCH', payload),
            );
            if (ok) setFormOpen(null);
          }}
        />
      )}

      {movOpen && (
        <MovementDialog
          key={movOpen.id}
          item={movOpen}
          labels={labels}
          locale={locale}
          common={common}
          busy={busy}
          onClose={() => setMovOpen(null)}
          onSubmit={async (payload) => {
            const ok = await mutar(() =>
              requestJson(`/api/inventory/${movOpen.id}/movements`, 'POST', payload),
            );
            if (ok) setMovOpen(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Alta y edición del SKU. **Sin campo de existencia en modo edición** — ver la nota de la
 * pantalla. En alta sí aparece, como existencia inicial, porque ahí no hay historial que
 * contradecir: el backend la convierte en el movimiento de apertura.
 */
function ItemDialog({
  state,
  labels,
  common,
  busy,
  onClose,
  onSubmit,
}: {
  state: { mode: 'create' } | { mode: 'edit'; item: InventoryItem };
  labels: Dictionary['inventory'];
  common: Dictionary['common'];
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const item = state.mode === 'edit' ? state.item : null;
  const [sku, setSku] = useState(item?.sku ?? '');
  const [name, setName] = useState(item?.name ?? '');
  const [location, setLocation] = useState(item?.location ?? '');
  const [supplier, setSupplier] = useState(item?.supplier ?? '');
  const [initialStock, setInitialStock] = useState('0');
  const [reorderPoint, setReorderPoint] = useState(String(item?.reorderPoint ?? 0));
  const [unitCost, setUnitCost] = useState(String(item?.unitCostOriginal ?? 0));
  const [currency, setCurrency] = useState(item?.unitCostCurrency ?? 'GTQ');

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent closeLabel={common.close}>
        <DialogTitle>{state.mode === 'create' ? labels.addItem : labels.editItem}</DialogTitle>
        {state.mode === 'edit' && <DialogDescription>{labels.stockIsLedger}</DialogDescription>}
        <form
          data-density="comfortable"
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const comun = {
              name,
              location: location.trim() || null,
              supplier: supplier.trim() || null,
              reorderPoint: Number(reorderPoint) || 0,
              unitCost: Number(unitCost) || 0,
              unitCostCurrency: currency,
            };
            onSubmit(
              state.mode === 'create'
                ? { ...comun, sku, quantityOnHand: Number(initialStock) || 0 }
                : comun,
            );
          }}
        >
          {state.mode === 'create' && (
            <Field
              id="inv-sku"
              label={labels.fieldSku}
              value={sku}
              required
              maxLength={64}
              onChange={(e) => setSku(e.target.value)}
            />
          )}
          <Field
            id="inv-name"
            label={labels.fieldName}
            value={name}
            required
            maxLength={200}
            onChange={(e) => setName(e.target.value)}
          />
          <Field
            id="inv-location"
            label={labels.fieldLocation}
            value={location}
            maxLength={120}
            onChange={(e) => setLocation(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            {state.mode === 'create' && (
              <Field
                id="inv-initial"
                label={labels.fieldInitialStock}
                type="number"
                min={0}
                step="any"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
              />
            )}
            <Field
              id="inv-reorder"
              label={labels.fieldReorderPoint}
              type="number"
              min={0}
              step="any"
              value={reorderPoint}
              onChange={(e) => setReorderPoint(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              id="inv-cost"
              label={labels.fieldUnitCost}
              type="number"
              min={0}
              step="any"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-currency">{labels.fieldCurrency}</Label>
              <select
                id="inv-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-body"
              >
                <option value="GTQ">GTQ</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <Field
            id="inv-supplier"
            label={labels.fieldSupplier}
            value={supplier}
            maxLength={200}
            onChange={(e) => setSupplier(e.target.value)}
          />
          <div className="mt-1 flex justify-end">
            <Button type="submit" disabled={busy}>
              {labels.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Registro de un movimiento: el ÚNICO camino para cambiar la existencia. */
function MovementDialog({
  item,
  labels,
  locale,
  common,
  busy,
  onClose,
  onSubmit,
}: {
  item: InventoryItem;
  labels: Dictionary['inventory'];
  locale: Locale;
  common: Dictionary['common'];
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [movementType, setMovementType] = useState<MovementType>('in');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent closeLabel={common.close}>
        <DialogTitle>{labels.recordMovement}</DialogTitle>
        <DialogDescription>
          {item.name} · {labels.colOnHand}: {formatNumber(item.quantityOnHand, locale)}
        </DialogDescription>
        <form
          data-density="comfortable"
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              movementType,
              quantity: Number(quantity),
              reason: reason.trim() || null,
            });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mov-type">{labels.fieldMovementType}</Label>
            <select
              id="mov-type"
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as MovementType)}
              className="h-9 rounded-md border border-input bg-background px-3 text-body"
            >
              <option value="in">{labels.movement.in}</option>
              <option value="out">{labels.movement.out}</option>
              <option value="adjustment">{labels.movement.adjustment}</option>
            </select>
          </div>
          <Field
            id="mov-qty"
            label={labels.fieldQuantity}
            type="number"
            step="any"
            // Solo el ajuste admite negativo: un conteo físico es "sobran 3" o "faltan 3",
            // y forzar eso a una salida diría que salió mercadería cuando solo se corrigió
            // el libro. Entrada y salida llevan el signo en el tipo.
            min={movementType === 'adjustment' ? undefined : 0}
            value={quantity}
            required
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Field
            id="mov-reason"
            label={labels.fieldReason}
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="mt-1 flex justify-end">
            <Button type="submit" disabled={busy}>
              {labels.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
