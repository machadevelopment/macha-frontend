'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { InsightPoint } from '@/components/ui/insight-point';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

type FormLabels = Dictionary['landing']['form'];

type Estado = 'idle' | 'enviando' | 'ok' | 'error' | 'rate_limited';

/**
 * Formulario de solicitud de demo — conversión de la landing.
 *
 * Pedido de Jose (2026-08-21): "un form básico, para que pongan como datos básicos".
 * Vive en la banda CTA (ancla `#demo`): los botones del nav/hero/planes apuntan acá.
 *
 * El envío va al BFF público (`/api/public/demo-requests`), que reenvía al backend sin
 * sesión. El señuelo `website` va oculto: un bot simple lo llena y el backend responde 200
 * sin guardar.
 */
export function LandingFormularioDemo({ labels, locale }: { labels: FormLabels; locale: Locale }) {
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [estado, setEstado] = useState<Estado>('idle');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (estado === 'enviando') return;
    setEstado('enviando');

    try {
      const res = await fetch('/api/public/demo-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          companyName,
          email,
          phone: phone || undefined,
          message: message || undefined,
          locale,
          website: website || undefined,
        }),
      });

      if (res.status === 429) {
        setEstado('rate_limited');
        return;
      }
      if (!res.ok) {
        setEstado('error');
        return;
      }
      setEstado('ok');
      setName('');
      setCompanyName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch {
      setEstado('error');
    }
  }

  return (
    <div className="relative mx-auto flex w-full max-w-[640px] flex-col items-center gap-8 text-center">
      <InsightPoint
        variant="ambient"
        className="-top-52 left-1/2 h-[420px] w-[420px] -translate-x-1/2"
      />
      <div className="relative space-y-3">
        <h2 className="text-sectionbig text-foreground">{labels.title}</h2>
        <p className="mx-auto max-w-[52ch] text-lhero text-muted-foreground">{labels.subtitle}</p>
      </div>

      {estado === 'ok' ? (
        <p
          role="status"
          className="relative w-full rounded-md border border-success-bd bg-success-bg px-4 py-3 text-left text-[15px] text-success"
        >
          {labels.success}
        </p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="relative w-full space-y-4 rounded-xl border border-border bg-canvas p-5 text-left shadow-sm sm:p-6"
          noValidate
        >
          {/* Señuelo anti-bot: fuera de pantalla, tabIndex -1, autocomplete off. */}
          <div aria-hidden className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
            <label htmlFor="demo-website">Website</label>
            <input
              id="demo-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(ev) => setWebsite(ev.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="demo-name"
              label={labels.name}
              required
              autoComplete="name"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
            />
            <Field
              id="demo-company"
              label={labels.company}
              required
              autoComplete="organization"
              value={companyName}
              onChange={(ev) => setCompanyName(ev.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="demo-email"
              label={labels.email}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
            />
            <Field
              id="demo-phone"
              label={labels.phone}
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(ev) => setPhone(ev.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="demo-message">{labels.message}</Label>
            <Textarea
              id="demo-message"
              rows={4}
              value={message}
              onChange={(ev) => setMessage(ev.target.value)}
              className="min-h-[96px] resize-y"
            />
          </div>

          {(estado === 'error' || estado === 'rate_limited') && (
            <p role="alert" className="text-[14px] text-danger">
              {estado === 'rate_limited' ? labels.rateLimited : labels.error}
            </p>
          )}

          <Button type="submit" className="w-full sm:w-auto" disabled={estado === 'enviando'}>
            {estado === 'enviando' ? labels.submitting : labels.submit}
          </Button>
        </form>
      )}
    </div>
  );
}
