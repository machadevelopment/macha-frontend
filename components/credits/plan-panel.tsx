'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadError } from '@/components/ui/load-error';
import { request, requestJson, type RequestError } from '@/lib/api/browser';
import { formatMoney, formatNumber } from '@/lib/format';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * Gestión de plan del cliente (ticket B3, ronda de QA 2026-08-11).
 *
 * La pantalla de Créditos solo dejaba comprar créditos sueltos. Pasa a ser "Plan y
 * créditos": el plan actual, el catálogo para comparar, y el upgrade — con la recarga
 * individual conservada debajo, que sigue siendo `CreditsPurchasePanel` sin tocar.
 *
 * SOLO EL OWNER CAMBIA DE PLAN. La autoridad es el backend (capacidad `billing`, que ya
 * era `['owner']`); esto es para no pintar botones que van a devolver 403. Los demás roles
 * VEN el plan y el catálogo — saber en qué plan está la empresa no es información
 * sensible, y esconderla solo obliga a preguntar.
 *
 * EL PRECIO SE MUESTRA EN USD PORQUE ESTÁ EN USD. `amountUsdCents` es la moneda del
 * proveedor de pagos, no la moneda base de la empresa: convertirlo a GTQ acá sería
 * inventar un tipo de cambio que nadie va a cobrar. Es una de las poquísimas cifras del
 * producto que NO va en la moneda base, y por eso lleva su código explícito, como manda
 * CLAUDE.md.
 *
 * DE LOS PLANES, EL SALVIA NO SE USA. Esta es zona "producto" (design guide §2.7): el
 * plan actual se marca con la tinta neutra y un ✓, no con el verde de marca. El salvia
 * diría "esto es Macha", y lo que hay que decir es "este es el tuyo".
 */

interface Plan {
  code: string;
  name: string;
  amountUsdCents: number;
  monthlyCredits: number;
  sortOrder: number;
  active: boolean;
}

interface PlansResponse {
  current: {
    planCode: string;
    status: string;
    amountUsdCents: number;
    name: string;
    monthlyCredits: number | null;
  } | null;
  available: Plan[];
}

export function PlanPanel({
  locale,
  labels,
  canChange,
}: {
  locale: Locale;
  labels: Dictionary['credits']['plan'];
  canChange: boolean;
}) {
  const [data, setData] = useState<PlansResponse | null>(null);
  const [loadError, setLoadError] = useState<RequestError | null>(null);
  /** Código del plan cuyo cambio está en vuelo; también deshabilita a los demás. */
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [errorCambio, setErrorCambio] = useState<string | null>(null);

  useEffect(() => {
    void request<PlansResponse>('/api/plans').then((r) => {
      if (r.ok) setData(r.data);
      else setLoadError(r.error);
    });
  }, []);

  async function cambiar(planCode: string) {
    setCambiando(planCode);
    setErrorCambio(null);
    /*
     * ═══ UN PLAN PAGADO DEVUELVE `checkoutUrl` (CU-868ku66du) ═══
     *
     * Antes esta respuesta siempre traía `{ planCode, changed }` porque el backend aplicaba el
     * cambio directo, sin cobrar. Ahora un plan con precio > 0 abre checkout de Recurrente y
     * responde con la URL; el gratuito y el mismo plan siguen respondiendo como antes.
     *
     * `checkoutUrl` es OPCIONAL en el tipo a propósito: las dos formas son válidas y cuál llega
     * depende del precio del plan destino, que el frontend no debería tener que replicar.
     */
    const result = await requestJson<{
      planCode: string;
      changed: boolean;
      checkoutUrl?: string;
    }>('/api/plans/change', 'POST', { planCode });
    if (!result.ok) {
      // El backend responde 409 con motivos accionables ("el plan ya no está disponible").
      // `proxyMutation` los conserva; se muestran tal cual porque dicen qué hacer.
      const body = result.error.body;
      const delBackend =
        typeof body === 'object' &&
        body !== null &&
        typeof (body as { error?: unknown }).error === 'string'
          ? (body as { error: string }).error
          : null;
      setErrorCambio(delBackend ?? labels.changeFailed);
      setCambiando(null);
      return;
    }
    /*
     * Plan pagado: a pagar. Mismo patrón que la recarga de créditos
     * (`credits-purchase-panel.tsx`), incluido dejar `cambiando` puesto — el navegador está a
     * punto de irse de esta página y apagar el spinner antes solo alcanzaría a parpadear.
     *
     * No se recarga el estado: la suscripción todavía NO cambió, y refrescarla mostraría el plan
     * viejo por un instante justo antes de la redirección. Al volver de Recurrente, el
     * `successUrl` trae `?planChanged=1` y la página se monta de nuevo con el plan ya aplicado
     * por el webhook.
     */
    if (result.data.checkoutUrl) {
      window.location.href = result.data.checkoutUrl;
      return;
    }

    // Se recarga el estado desde el servidor en vez de parchear el local: el cambio de
    // plan también mueve `amountUsdCents` de la suscripción, y reconstruir eso acá sería
    // duplicar la regla que el backend ya aplicó.
    const refresh = await request<PlansResponse>('/api/plans');
    if (refresh.ok) setData(refresh.data);
    setCambiando(null);
  }

  if (loadError) return <LoadError error={loadError} labels={labels.loadError} />;
  if (!data) return null;

  const precio = (cents: number) =>
    cents === 0 ? labels.free : `${formatMoney(cents / 100, 'USD', locale)} ${labels.perMonth}`;

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <p className="text-cardh2">{labels.title}</p>
        <p className="text-body text-muted-foreground">
          {canChange ? labels.subtitle : labels.readOnly}
        </p>
      </div>

      {data.current && (
        <div className="rounded-md border border-border bg-soft px-3 py-2">
          <p className="font-mono text-eyebrow uppercase text-faint">{labels.currentEyebrow}</p>
          <p className="text-cardh2">{data.current.name}</p>
          <p className="text-body tabular-nums text-muted-foreground">
            {precio(data.current.amountUsdCents)}
            {data.current.monthlyCredits !== null && (
              <>
                {' · '}
                {labels.includedCredits.replace(
                  '{n}',
                  formatNumber(data.current.monthlyCredits, locale),
                )}
              </>
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {data.available.map((plan) => {
          const esActual = data.current?.planCode === plan.code;
          return (
            <div
              key={plan.code}
              className={cn(
                'flex flex-col gap-2 rounded-md border p-3',
                esActual ? 'border-foreground bg-card' : 'border-border bg-card',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-cardh2">{plan.name}</p>
                {esActual && (
                  <span className="flex shrink-0 items-center gap-1 font-mono text-eyebrow uppercase text-faint">
                    <Check className="h-3 w-3" strokeWidth={2.2} />
                    {labels.currentBadge}
                  </span>
                )}
              </div>

              <p className="text-body tabular-nums">{precio(plan.amountUsdCents)}</p>
              <p className="text-body tabular-nums text-muted-foreground">
                {labels.includedCredits.replace('{n}', formatNumber(plan.monthlyCredits, locale))}
              </p>

              {canChange && !esActual && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-auto"
                  disabled={cambiando !== null}
                  onClick={() => void cambiar(plan.code)}
                >
                  {cambiando === plan.code ? labels.changing : labels.choose}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/*
        Se dice explícitamente que el cambio no pasa por cobro. Callarlo dejaría al owner
        esperando un cargo que no va a llegar, o peor, temiendo uno que sí. Ver la cabecera
        de `modules/billing/plans.ts` en el backend para el porqué.
      */}
      {canChange && <p className="text-body text-faint">{labels.noChargeNote}</p>}

      {errorCambio && (
        // Color como señal de estado, con texto+fondo+borde juntos (design guide §1).
        <p
          role="alert"
          className="rounded-md border border-danger-bd bg-danger-bg px-2 py-1.5 text-body text-danger"
        >
          {errorCambio}
        </p>
      )}
    </Card>
  );
}
