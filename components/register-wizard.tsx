'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
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
  const [error, setError] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      const data: RegisterResponse = await res.json();
      window.location.href = data.checkoutUrl;
    } catch {
      setError(true);
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
            onChange={(e) => setForm({ ...form, locale: e.target.value as RegisterRequest['locale'] })}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>

        {error && <p className="text-body text-danger">{labels.error}</p>}

        <Button type="submit" disabled={submitting}>
          {submitting ? labels.submitting : labels.submit}
        </Button>
      </form>
    </Card>
  );
}
