'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { request } from '@/lib/api/browser';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

type FormLabels = Dictionary['landing']['form'];

type Estado = 'idle' | 'enviando' | 'ok' | 'error' | 'rate_limited';

/**
 * Formulario de solicitud de demo — conversión de la landing (ancla `#demo` / Contacto).
 *
 * Pedido de Jose: "un form básico". Pedido de Keneth: que no se vea "de ahuevo" — o sea,
 * que se lea como el CIERRE del Figma (titular + bajada + acción), no como un formulario de
 * app con tarjeta, sombra y cinco campos gordos.
 *
 * Por eso: sin caja envolvente, sin mancha ambient, sin textarea de mensaje. Nombre,
 * empresa, correo, teléfono opcional y el botón. El envío sigue igual (BFF público → lead
 * en base + aviso best-effort).
 */
export function LandingFormularioDemo({ labels, locale }: { labels: FormLabels; locale: Locale }) {
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [estado, setEstado] = useState<Estado>('idle');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (estado === 'enviando') return;
    setEstado('enviando');

    const result = await request<{ ok: true }>('/api/public/demo-requests', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        companyName,
        email,
        phone: phone || undefined,
        locale,
        website: website || undefined,
      }),
    });

    if (!result.ok) {
      setEstado(result.error.status === 429 ? 'rate_limited' : 'error');
      return;
    }

    setEstado('ok');
    setName('');
    setCompanyName('');
    setEmail('');
    setPhone('');
  }

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-8">
      <div className="space-y-3 text-center">
        <h2 className="text-section text-foreground">{labels.title}</h2>
        <p className="mx-auto max-w-[42ch] text-lsub text-muted-foreground">{labels.subtitle}</p>
      </div>

      {estado === 'ok' ? (
        <p
          role="status"
          className="rounded-md border border-success-bd bg-success-bg px-4 py-3 text-center text-lprose text-success"
        >
          {labels.success}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex w-full min-w-0 flex-col gap-3" noValidate>
          {/* Señuelo anti-bot: sr-only, no absolute off-screen (eso empuja el scroll horizontal). */}
          <div className="sr-only" aria-hidden>
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          {(estado === 'error' || estado === 'rate_limited') && (
            <p role="alert" className="text-lprose text-danger">
              {estado === 'rate_limited' ? labels.rateLimited : labels.error}
            </p>
          )}

          <Button type="submit" className="mt-1 w-full" disabled={estado === 'enviando'}>
            {estado === 'enviando' ? labels.submitting : labels.submit}
          </Button>
        </form>
      )}
    </div>
  );
}
