'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { LoadError } from '@/components/ui/load-error';
import { Badge } from '@/components/ui/badge';
import { errorMessage, request, requestJson } from '@/lib/api/browser';
import { formatDate } from '@/lib/format';
import type { FxRateResponse } from '@/app/api/fx-rate/route';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';
import type { RequestError } from '@/lib/api/browser';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * EL TIPO DE CAMBIO, MANTENIDO POR EL CLIENTE (decisión de Jose, 2026-08-25)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Hasta hoy la tasa la cargaba Macha desde el panel de administración y el cliente la veía sin
 * poder tocarla. Jose eligió que la toque el cliente, y explícitamente cualquier ADMIN de la
 * empresa y no solo el dueño: "hay que ajustarlo seguido".
 *
 * ═══ LO PRIMERO QUE DICE LA PANTALLA ES QUE NO ES RETROACTIVO ═══
 *
 * Y va ARRIBA del campo, no debajo del botón. Es el miedo que tuvo este ticket parado semanas
 * —"¿un ajuste de hoy me mueve las cifras de marzo?"— y quien está por escribir una cifra que
 * mueve dinero necesita saberlo ANTES de escribirla, no después de guardar.
 *
 * No es una promesa de esta pantalla: cada fila financiera congela su `fx_rate` al promoverse.
 * El backend lo confirma en `appliesRetroactively`, así que el aviso sale del dato y no de una
 * cadena optimista escrita acá.
 *
 * ═══ EL ROL SE PINTA, NO SE AUTORIZA ═══
 *
 * `puedeEditar` decide si se muestra el formulario. La autoridad es la capacidad
 * `manage_fx_rate` del backend; esto solo evita ofrecerle a un `member` un campo que va a
 * devolver 403.
 */
export function FxRatePanel({
  locale,
  labels,
  common,
  puedeEditar,
}: {
  locale: Locale;
  labels: Dictionary['settings']['fx'];
  common: Dictionary['common'];
  puedeEditar: boolean;
}) {
  const [data, setData] = useState<FxRateResponse | null>(null);
  const [error, setError] = useState<RequestError | null>(null);
  const [rate, setRate] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(() => {
    setError(null);
    void request<FxRateResponse>('/api/fx-rate').then((r) => {
      if (r.ok) setData(r.data);
      else setError(r.error);
    });
  }, []);

  useEffect(cargar, [cargar]);

  async function guardar() {
    const valor = Number(rate);
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error(labels.invalid);
      return;
    }
    setGuardando(true);
    try {
      const r = await requestJson('/api/fx-rate', 'POST', {
        quoteCurrency: data!.quoteCurrency,
        rate: valor,
        effectiveDate: fecha,
      });
      if (!r.ok) {
        toast.error(errorMessage(r.error) ?? common.loadError.server);
        return;
      }
      toast.success(labels.saved);
      setRate('');
      cargar();
    } finally {
      setGuardando(false);
    }
  }

  if (error) return <LoadError error={error} labels={common.loadError} onRetry={cargar} />;
  if (!data) return <p className="text-body text-muted-foreground">{common.loading}</p>;

  const vigente = data.rates[0];

  return (
    <Card>
      <CardTitle className="mb-1">{labels.title}</CardTitle>
      <p className="mb-3 text-body text-muted-foreground">
        {labels.subtitle
          .replace('{base}', data.baseCurrency)
          .replace('{quote}', data.quoteCurrency)}
      </p>

      {/*
        El aviso va ARRIBA del campo. Ver la cabecera: es lo que el usuario necesita saber
        antes de escribir. `appliesRetroactively` viene del backend, así que el texto no
        afirma algo que la pantalla no pueda comprobar.
      */}
      {!data.appliesRetroactively && (
        <p className="mb-4 rounded-md border border-border bg-muted px-3 py-2 text-body text-muted-foreground">
          {labels.notRetroactive}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-eyebrow uppercase text-faint">{labels.current}</span>
        {vigente ? (
          <>
            <span className="font-mono text-cardh2 tabular-nums">
              1 {data.quoteCurrency} = {vigente.rate} {data.baseCurrency}
            </span>
            <Badge variant="neutral">
              {labels.since.replace('{date}', formatDate(vigente.effectiveDate, locale))}
            </Badge>
          </>
        ) : (
          /* Sin tasa, un Excel en dos monedas se marca por `missing_fx_rate` y no entra a la
             contabilidad. Decirlo es más útil que un guion. */
          <span className="text-body text-danger">{labels.none}</span>
        )}
      </div>

      {puedeEditar ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Field
              id="fx-rate"
              type="number"
              step="0.0001"
              min="0"
              required
              label={labels.rateLabel
                .replace('{base}', data.baseCurrency)
                .replace('{quote}', data.quoteCurrency)}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>
          <div className="w-44">
            <Field
              id="fx-date"
              type="date"
              required
              label={labels.dateLabel}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <Button onClick={() => void guardar()} disabled={guardando || rate.trim() === ''}>
            {guardando ? common.loading : labels.save}
          </Button>
        </div>
      ) : (
        // Un `member` ve la tasa pero no el formulario: necesita poder auditar con qué se
        // convirtió lo que subió, sin poder moverlo.
        <p className="text-body text-faint">{labels.readOnly}</p>
      )}

      {data.rates.length > 1 && (
        <div className="mt-5 border-t border-border pt-3">
          <p className="mb-2 font-mono text-eyebrow uppercase text-faint">{labels.history}</p>
          <ul className="flex flex-col gap-1">
            {data.rates.slice(1).map((r) => (
              <li key={r.id} className="flex items-baseline justify-between gap-3 text-body">
                <span className="text-muted-foreground">{formatDate(r.effectiveDate, locale)}</span>
                <span className="font-mono tabular-nums">{r.rate}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
