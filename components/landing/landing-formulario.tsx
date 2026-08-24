'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
 * Por eso: sin caja envolvente y sin mancha ambient. El envío sigue igual (BFF público → lead
 * en base + aviso best-effort).
 *
 * ═══ EL CAMPO DE CONTEXTO VUELVE, ACOTADO (CU-868kw1pgh) ═══
 *
 * Este archivo decía "sin textarea de mensaje", y era pedido explícito de Keneth. Jose pidió
 * lo contrario: "un pequeño espacio para tener más contexto de la empresa". El criterio de
 * producto cambia; el motivo del original no, así que se paga lo mínimo:
 *
 *   · UN campo más, no cinco. La objeción era "cinco campos gordos", no "ningún campo de
 *     texto";
 *   · OPCIONAL y el último. Obligatorio subiría justo la fricción que el diseño evitaba, en
 *     el único formulario que convierte visitantes en conversaciones;
 *   · TRES filas de alto. Un textarea que ocupa media pantalla es lo que hacía que el
 *     formulario se leyera como una solicitud de empleo en vez del cierre del Figma.
 *
 * No hace falta nada del backend: `POST /public/demo-requests` ya acepta `message` (opcional,
 * tope 2.000), lo guarda, lo muestra en el panel de admin y lo incluye en el correo de aviso.
 * Verificado contra el backend actual, no supuesto — el ticket lo marcaba sin confirmar.
 *
 * No usa `Field` porque `Field` envuelve un `Input` de una línea. Se compone a mano con `Label`
 * + `Textarea`, que es lo mismo que hace `Field` y mantiene el espaciado de la rejilla.
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

    const result = await request<{ ok: true }>('/api/public/demo-requests', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        companyName,
        email,
        phone: phone || undefined,
        // `undefined` y no `''`: el backend distingue "no escribió nada" (null en base) de un
        // texto vacío, y el panel de admin pinta el hueco en vez de una línea en blanco.
        message: message || undefined,
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
    setMessage('');
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

          {/*
            Va al FINAL y a lo ancho: es lo opcional y lo más largo de escribir. Arriba
            rompería la lectura de los cuatro campos cortos que sí hacen falta.
          */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="demo-message">{labels.message}</Label>
            <Textarea
              id="demo-message"
              name="message"
              rows={3}
              /* El mismo tope que valida el backend: cortar acá evita un 422 después de que la
                 persona ya escribió, que es el peor momento para decírselo. */
              maxLength={2000}
              className="resize-y"
              value={message}
              onChange={(ev) => setMessage(ev.target.value)}
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
