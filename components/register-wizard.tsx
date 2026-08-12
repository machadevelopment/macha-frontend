'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/card';
import { request, requestJson, errorMessage } from '@/lib/api/browser';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { formatMoney, formatNumber } from '@/lib/format';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';
import type { RegisterPlan, RegisterRequest, RegisterResponse } from '@/lib/api/billing';

/**
 * CU-868kfvae1: registro autoservicio. Al enviar, crea la empresa+owner+
 * suscripción pending_checkout (POST /register vía /api/register) y redirige
 * de inmediato al checkout de Recurrente devuelto — el saldo/estado real de la
 * cuenta solo se activa tras el webhook (criterio 2, ya cubierto en el backend).
 *
 * TICKET B4: se suma la SELECCIÓN DE PLAN. Antes la empresa nacía siempre con el plan por
 * defecto y el usuario descubría qué había contratado después de pagar.
 *
 * El catálogo se pide a `/api/register/plans` y NO a `/api/plans`. No es un descuido: el
 * segundo cuelga de `tenantDerive` en el backend y exige una empresa resuelta desde la
 * membresía — y quien está en esta pantalla todavía no tiene ninguna, que es justo lo que
 * está por crear. Esa ruta le respondería 403.
 *
 * NO SE PARTE EN PASOS. El ticket habla de "un paso o sección"; es una sección. Son cuatro
 * campos y tres tarjetas: partirlo en dos pantallas agrega una transición y un estado
 * intermedio que perder, a cambio de nada. La sección de plan va PRIMERO porque es la
 * decisión que el usuario vino a tomar; los datos de la empresa son el trámite.
 */
export function RegisterWizard({
  labels,
  locale,
}: {
  labels: Dictionary['register'];
  locale: Locale;
}) {
  const [form, setForm] = useState<RegisterRequest>({
    name: '',
    industry: '',
    baseCurrency: 'GTQ',
    locale: 'es',
  });
  const [planes, setPlanes] = useState<RegisterPlan[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void request<RegisterPlan[]>('/api/register/plans').then((r) => {
      if (!r.ok) {
        // El catálogo no es un requisito duro: el backend elige el plan de entrada si no
        // le mandan `planCode`. Así que un fallo acá NO bloquea el alta — se esconde la
        // sección y el formulario sigue funcionando. Bloquear el registro entero porque no
        // se pudo pintar una lista de precios sería el peor intercambio posible.
        setPlanes([]);
        return;
      }
      setPlanes(r.data);
      // Preselección: el primer plan por `sortOrder`, que es el de entrada. Es el mismo
      // que elegiría el backend si no mandáramos nada, así que la pantalla no miente
      // sobre lo que va a pasar si el usuario no toca nada.
      if (r.data[0]) setForm((f) => ({ ...f, planCode: r.data[0]!.code }));
    });
  }, []);

  const planElegido = planes?.find((p) => p.code === form.planCode) ?? null;
  // El texto del botón cambia según haya cobro o no: "Continuar al pago" delante de un
  // plan gratuito es una promesa falsa.
  const irAPago = (planElegido?.amountUsdCents ?? 0) > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await requestJson<RegisterResponse>('/api/register', 'POST', form);
      if (!result.ok) {
        // CU-868kmxu41: el mensaje del backend, cuando lo hay, explica QUÉ pasa — p. ej.
        // que el registro no está disponible en este entorno. El genérico decía "intenta
        // de nuevo", que ante un fallo de configuración es una instrucción falsa: la
        // persona reintenta contra un muro. Se guarda el texto, no un booleano.
        setError(errorMessage(result.error) ?? labels.error);
        return;
      }
      // CU-868kmxu41: sin proveedor de pagos configurado no hay checkout al que ir. La
      // empresa YA quedó creada, así que se entra a la app; redirigir a `null` dejaba al
      // usuario en una URL rota justo después de un alta exitosa.
      window.location.href = result.data.checkoutUrl ?? '/dashboard';
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {planes !== null && planes.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-cardh2">{labels.planTitle}</legend>
            <p className="mb-1 text-body text-muted-foreground">{labels.planSubtitle}</p>

            {/*
              Tarjetas y no un `<select>`: el ticket pide comparar, y un desplegable
              esconde justo lo que hay que comparar (créditos contra precio) detrás de un
              clic. Van como radios de verdad —`<fieldset>` + `<legend>` + `role`
              implícito del input— y no como `<div onClick>`: es una elección única, el
              teclado y el lector de pantalla la entienden gratis, y el navegador se
              encarga de las flechas entre opciones.
            */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {planes.map((plan, i) => {
                const elegido = form.planCode === plan.code;
                return (
                  <label
                    key={plan.code}
                    className={cn(
                      'flex cursor-pointer flex-col gap-1 rounded-md border p-3 transition-colors',
                      elegido
                        ? 'border-foreground bg-card'
                        : 'border-border bg-card hover:bg-muted',
                    )}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-cardh2">{plan.name}</span>
                      <input
                        type="radio"
                        name="planCode"
                        value={plan.code}
                        checked={elegido}
                        onChange={() => setForm({ ...form, planCode: plan.code })}
                        className="sr-only"
                      />
                      {elegido && (
                        <Check className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden />
                      )}
                    </span>

                    <span className="text-body tabular-nums">
                      {plan.amountUsdCents === 0
                        ? labels.planFree
                        : `${formatMoney(plan.amountUsdCents / 100, 'USD', locale)} ${labels.planPerMonth}`}
                    </span>
                    <span className="text-body tabular-nums text-muted-foreground">
                      {labels.planCredits.replace('{n}', formatNumber(plan.monthlyCredits, locale))}
                    </span>

                    {/* El primero del catálogo es el recomendado. El ticket pedía destacar
                        uno, y el orden lo decide `sort_order` desde el backoffice: así la
                        recomendación se cambia sin desplegar, como el resto del catálogo. */}
                    {i === 0 && (
                      <span className="mt-auto pt-1 font-mono text-eyebrow uppercase text-faint">
                        {labels.planRecommended}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        <Field
          id="name"
          label={labels.name}
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Field
          id="industry"
          label={labels.industry}
          required
          value={form.industry}
          onChange={(e) => setForm({ ...form, industry: e.target.value })}
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="baseCurrency">{labels.baseCurrency}</Label>
          <select
            id="baseCurrency"
            className="h-9 rounded-md border border-border bg-background px-3 text-body"
            value={form.baseCurrency}
            onChange={(e) =>
              setForm({ ...form, baseCurrency: e.target.value as RegisterRequest['baseCurrency'] })
            }
          >
            <option value="GTQ">GTQ</option>
            <option value="USD">USD</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="locale">{labels.locale}</Label>
          <select
            id="locale"
            className="h-9 rounded-md border border-border bg-background px-3 text-body"
            value={form.locale}
            onChange={(e) =>
              setForm({ ...form, locale: e.target.value as RegisterRequest['locale'] })
            }
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>

        {error && <p className="text-body text-danger">{error}</p>}

        <Button type="submit" disabled={submitting}>
          {submitting ? labels.submitting : irAPago ? labels.submit : labels.submitFree}
        </Button>
      </form>
    </Card>
  );
}
