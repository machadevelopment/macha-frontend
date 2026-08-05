'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { requestJson, errorMessage } from '@/lib/api/browser';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { RegisterRequest, RegisterResponse } from '@/lib/api/billing';

/**
 * CU-868kfvae1: registro autoservicio. Al enviar, crea la empresa+owner+
 * suscripción pending_checkout (POST /register vía /api/register) y redirige
 * de inmediato al checkout de Recurrente devuelto — el saldo/estado real de la
 * cuenta solo se activa tras el webhook (criterio 2, ya cubierto en el backend).
 */
export function RegisterWizard({ labels }: { labels: Dictionary['register'] }) {
  const [form, setForm] = useState<RegisterRequest>({
    name: '',
    industry: '',
    baseCurrency: 'GTQ',
    locale: 'es',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          {submitting ? labels.submitting : labels.submit}
        </Button>
      </form>
    </Card>
  );
}
