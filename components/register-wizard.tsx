'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/card';
import { request, requestJson, errorMessage } from '@/lib/api/browser';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { InsightPoint } from '@/components/ui/insight-point';
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
  const [planesError, setPlanesError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void request<RegisterPlan[]>('/api/register/plans').then((r) => {
      if (!r.ok) {
        // Fallo de red/API: se muestra aviso, no se esconde la sección. El POST sigue
        // pudiendo tomar el plan de entrada en el backend, pero el usuario debe saber
        // que la comparación de precios no cargó.
        setPlanes([]);
        setPlanesError(true);
        return;
      }
      setPlanesError(false);
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
  const sinPlanes = planes !== null && planes.length === 0;

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
        //
        // El bucket de alta (`register`, 3/hora) responde `{ error: 'rate_limited' }`.
        // Sin mapearlo, el formulario imprimía literalmente "rate_limited" — o peor, el
        // 429 del navegador sin contexto — y la persona no sabía si era el nombre, el
        // plan o un techo de intentos.
        const raw = errorMessage(result.error);
        if (result.error.kind === 'http' && result.error.status === 429) {
          setError(labels.rateLimited);
          return;
        }
        setError(raw ?? labels.error);
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
            {/* CU-868knx0vh: la tarjeta era una lista plana de campos con dos títulos del
                mismo peso. El eyebrow en mono nombra las dos secciones, que es lo que le da
                al formulario una jerarquía legible sin partirlo en pasos (la decisión de B4
                de no partirlo sigue en pie: son cuatro campos).

                El eyebrow va DENTRO del `<legend>` y no antes: un `<legend>` solo cuenta
                como tal si es el primer hijo del `<fieldset>`. */}
            <legend className="mb-1 flex flex-col gap-1">
              <span className="font-mono text-eyebrow uppercase text-faint">
                {labels.planEyebrow}
              </span>
              <span className="text-cardh2">{labels.planTitle}</span>
            </legend>
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
                      'flex cursor-pointer flex-col gap-1 rounded-md border bg-card p-3 transition-colors',
                      /*
                       * CU-868knx0vh: el borde del plan elegido pasa de tinta a SALVIA, y el
                       * check viaja dentro de un Insight Point.
                       *
                       * Es vitrina y la marca manda, pero se queda en el BORDE y en el sello:
                       * no se pinta la superficie de la tarjeta. Adentro hay un precio, y el
                       * salvia no va sobre un dato ni debajo de uno — un fondo verdoso bajo
                       * una cifra hace dudar de si el color pertenece al número. El precio se
                       * queda en tinta neutra.
                       */
                      elegido ? 'border-brand' : 'border-border hover:bg-muted',
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
                        <InsightPoint size="sm">
                          <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
                        </InsightPoint>
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
                        recomendación se cambia sin desplegar, como el resto del catálogo.

                        CU-868knx0vh: pasa de texto tenue a chip de MARCA. "Recomendado" es
                        una opinión de Macha sobre su propio catálogo —"esto es lo que la casa
                        sugiere"—, no un juicio sobre un dato del cliente: por eso salvia y no
                        `success`. En `text-faint` sobre blanco además rozaba el mínimo de
                        contraste. */}
                    {i === 0 && (
                      <Badge variant="brand" className="mt-auto w-fit">
                        {labels.planRecommended}
                      </Badge>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {(sinPlanes || planesError) && (
          <p
            role="status"
            className="rounded-md border border-warning-bd bg-warning-bg px-3 py-2 text-body text-warning"
          >
            {labels.plansUnavailable}
          </p>
        )}

        {/* Segunda sección. El separador y el eyebrow existen por lo mismo que arriba: el
            plan es la decisión y esto es el trámite, y hasta ahora los dos bloques pesaban
            igual en pantalla. */}
        {planes !== null && planes.length > 0 && (
          <div className="mt-1 flex flex-col gap-1 border-t border-soft pt-4">
            <span className="font-mono text-eyebrow uppercase text-faint">
              {labels.companyEyebrow}
            </span>
            <span className="text-cardh2">{labels.companyTitle}</span>
          </div>
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

        {/* Tripleta texto+fondo+borde (design guide §1.3): el color de estado nunca va solo
            como tinta. Era `text-danger` a secas sobre la tarjeta blanca. */}
        {error && (
          <p
            role="alert"
            className="rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-body text-danger"
          >
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting || sinPlanes}>
          {submitting ? labels.submitting : irAPago ? labels.submit : labels.submitFree}
        </Button>
      </form>
    </Card>
  );
}
