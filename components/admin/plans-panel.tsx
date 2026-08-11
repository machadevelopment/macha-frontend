'use client';

import { useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { AdminLoadError } from '@/components/admin/admin-load-error';
import { request, requestJson } from '@/lib/api/browser';
import { useResource } from '@/lib/api/use-resource';
import { formatNumber } from '@/lib/format';
import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * Catálogo de planes, editable desde el backoffice (ticket B3, ronda de QA 2026-08-11).
 *
 * El criterio del ticket era explícito: los planes se ajustan SIN DESPLEGAR. Es el mismo
 * patrón que ya usan las reglas de crédito y los parámetros de negocio, y por la misma
 * razón — el precio y el paquete de créditos de un plan son decisiones comerciales que
 * cambian de una semana a otra, y cada cambio no puede costar un deploy.
 *
 * SOLO `super_admin`. La autoridad es el backend (`manage_plans_and_templates`, que ya era
 * solo super_admin); esto solo evita pintar controles que van a devolver 403.
 *
 * NO HAY BORRAR, y no es un olvido. La baja es lógica: `active = false`. Una empresa puede
 * estar suscrita a un plan que ya no se ofrece, y borrar la fila rompería la FK de
 * `subscriptions`. Retirar del catálogo y borrar del historial son cosas distintas.
 *
 * EL `code` NO SE EDITA una vez creado: es la PK y la referencia ya escrita en las
 * suscripciones vivas. Si un código está mal, se crea el nuevo y se desactiva el viejo.
 */

interface Plan {
  code: string;
  name: string;
  amountUsdCents: number;
  monthlyCredits: number;
  sortOrder: number;
  active: boolean;
}

export function PlansPanel({
  labels,
  common,
  canEdit,
}: {
  labels: Dictionary['admin']['plans'];
  common: Dictionary['admin']['common'];
  canEdit: boolean;
}) {
  const [errores, setErrores] = useState<Record<string, string>>({});

  const { state, reload } = useResource<Plan[]>(
    useCallback(() => request<Plan[]>('/api/admin/plans'), []),
  );

  function setError(key: string, mensaje: string | null) {
    setErrores((prev) => {
      const next = { ...prev };
      if (mensaje === null) delete next[key];
      else next[key] = mensaje;
      return next;
    });
  }

  /** El backend responde 409/422 con el motivo exacto; se muestra tal cual. */
  function mensajeDeError(body: unknown, fallback: string): string {
    return typeof body === 'object' &&
      body !== null &&
      typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error
      : fallback;
  }

  if (state.status === 'error')
    return <AdminLoadError error={state.error} labels={common.loadError} onRetry={reload} />;
  if (state.status === 'loading') return null;

  const planes = state.data;

  return (
    <div className="flex flex-col gap-3">
      {!canEdit && <p className="text-body text-muted-foreground">{labels.readOnlyNote}</p>}

      {canEdit && (
        <NuevoPlan
          labels={labels}
          common={common}
          onCreated={reload}
          onError={(m) => setError('__new__', m)}
          error={errores['__new__']}
          mensajeDeError={mensajeDeError}
        />
      )}

      {planes.map((plan) => (
        <PlanCard
          key={plan.code}
          plan={plan}
          labels={labels}
          common={common}
          canEdit={canEdit}
          error={errores[plan.code]}
          onError={(m) => setError(plan.code, m)}
          onSaved={reload}
          mensajeDeError={mensajeDeError}
        />
      ))}
    </div>
  );
}

function PlanCard({
  plan,
  labels,
  common,
  canEdit,
  error,
  onError,
  onSaved,
  mensajeDeError,
}: {
  plan: Plan;
  labels: Dictionary['admin']['plans'];
  common: Dictionary['admin']['common'];
  canEdit: boolean;
  error?: string;
  onError: (mensaje: string | null) => void;
  onSaved: () => void;
  mensajeDeError: (body: unknown, fallback: string) => string;
}) {
  // Como texto, no como número: con `useState<number>` vaciar el campo para escribir otra
  // cifra lo vuelve `NaN` y el input salta a "0" mientras el operador todavía está
  // borrando. Acá eso sería sobre un PRECIO.
  const [nombre, setNombre] = useState(plan.name);
  const [precio, setPrecio] = useState(String(plan.amountUsdCents));
  const [creditos, setCreditos] = useState(String(plan.monthlyCredits));
  const [guardando, setGuardando] = useState(false);

  const sinCambios =
    nombre === plan.name &&
    precio.trim() === String(plan.amountUsdCents) &&
    creditos.trim() === String(plan.monthlyCredits);

  async function guardar(patch: Record<string, unknown>) {
    setGuardando(true);
    onError(null);
    const result = await requestJson<Plan>(
      `/api/admin/plans/${encodeURIComponent(plan.code)}`,
      'PATCH',
      patch,
    );
    setGuardando(false);
    if (!result.ok) {
      onError(mensajeDeError(result.error.body, labels.saveError));
      return;
    }
    onSaved();
  }

  function guardarCampos() {
    const p = Number(precio);
    const c = Number(creditos);
    // Solo se corta la basura no numérica. El rango lo valida el backend, y duplicar sus
    // reglas acá es garantizar que se separen.
    if (!Number.isFinite(p) || !Number.isFinite(c)) {
      onError(labels.invalidNumber);
      return;
    }
    void guardar({ name: nombre, amountUsdCents: p, monthlyCredits: c });
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-cardh2">{plan.name}</p>
          {/* El código es identificador técnico: mono, como las claves de platform_settings. */}
          <p className="font-mono text-eyebrow uppercase text-faint">{plan.code}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={plan.active ? 'success' : 'warning'}>
            {plan.active ? labels.active : labels.inactive}
          </Badge>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              disabled={guardando}
              onClick={() => void guardar({ active: !plan.active })}
            >
              {plan.active ? labels.deactivate : labels.activate}
            </Button>
          )}
        </div>
      </div>

      {canEdit ? (
        <div className="flex flex-wrap items-end gap-2">
          <Field
            id={`name-${plan.code}`}
            label={labels.nameLabel}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <Field
            id={`price-${plan.code}`}
            type="number"
            min={0}
            step={1}
            label={labels.priceLabel}
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
          <Field
            id={`credits-${plan.code}`}
            type="number"
            min={0}
            step={1}
            label={labels.creditsLabel}
            value={creditos}
            onChange={(e) => setCreditos(e.target.value)}
          />
          <Button size="sm" onClick={guardarCampos} disabled={guardando || sinCambios}>
            {guardando ? common.saving : common.save}
          </Button>
        </div>
      ) : (
        <p className="text-body tabular-nums text-muted-foreground">
          {labels.priceLabel}: {formatNumber(plan.amountUsdCents)} · {labels.creditsLabel}:{' '}
          {formatNumber(plan.monthlyCredits)}
        </p>
      )}

      {error && (
        <p role="alert" className="text-body text-danger">
          {error}
        </p>
      )}
    </Card>
  );
}

function NuevoPlan({
  labels,
  common,
  onCreated,
  onError,
  error,
  mensajeDeError,
}: {
  labels: Dictionary['admin']['plans'];
  common: Dictionary['admin']['common'];
  onCreated: () => void;
  onError: (mensaje: string | null) => void;
  error?: string;
  mensajeDeError: (body: unknown, fallback: string) => string;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [precio, setPrecio] = useState('0');
  const [creditos, setCreditos] = useState('0');
  const [creando, setCreando] = useState(false);

  async function crear() {
    const p = Number(precio);
    const c = Number(creditos);
    if (!Number.isFinite(p) || !Number.isFinite(c)) {
      onError(labels.invalidNumber);
      return;
    }
    setCreando(true);
    onError(null);
    const result = await requestJson('/api/admin/plans', 'POST', {
      code: code.trim(),
      name: name.trim(),
      amountUsdCents: p,
      monthlyCredits: c,
    });
    setCreando(false);
    if (!result.ok) {
      // El 409 del backend dice "Ya existe un plan con el código 'X'", y el 422 de TypeBox
      // marca el patrón del código. Los dos son accionables.
      onError(mensajeDeError(result.error.body, labels.createError));
      return;
    }
    setCode('');
    setName('');
    setPrecio('0');
    setCreditos('0');
    onCreated();
  }

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <p className="text-cardh2">{labels.createTitle}</p>
        {/* El patrón del código no es un capricho: viaja a `subscriptions.plan_code` y a
            la URL del PATCH. Se dice de entrada para no fallar después de escribir todo. */}
        <p className="text-body text-muted-foreground">{labels.codeHint}</p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Field
          id="new-plan-code"
          label={labels.codeLabel}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <Field
          id="new-plan-name"
          label={labels.nameLabel}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          id="new-plan-price"
          type="number"
          min={0}
          step={1}
          label={labels.priceLabel}
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
        />
        <Field
          id="new-plan-credits"
          type="number"
          min={0}
          step={1}
          label={labels.creditsLabel}
          value={creditos}
          onChange={(e) => setCreditos(e.target.value)}
        />
        <Button size="sm" onClick={crear} disabled={creando || !code.trim() || !name.trim()}>
          {creando ? common.saving : labels.createAction}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-body text-danger">
          {error}
        </p>
      )}
    </Card>
  );
}
