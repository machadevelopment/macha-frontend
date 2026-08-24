'use client';

import { useCallback, useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { usePeriodScope } from '@/components/dashboard/period-scope';
import { request } from '@/lib/api/browser';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { filaBase, monedasExtranjeras, tasaUnica } from '@/components/dashboard/composicion-moneda';
import type { CurrencyCompositionResponse } from '@/lib/api/dashboard';
import type { DateRange } from '@/lib/period';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * QUÉ MONEDAS HAY EN EL PERÍODO Y A QUÉ TASA SE CONSOLIDARON — CU-868kj3gnv
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *
 * El PRD §6 dice que "la moneda aplicada, la tasa usada... son siempre visibles" y el
 * dashboard no las mostraba: consolidaba todo a la base sin decir a qué tasa. El número era
 * correcto y no era auditable, que en una herramienta de CFO no es lo mismo.
 *
 * ═══ NO ES UN TOGGLE, Y ESO ES UN HALLAZGO, NO UN RECORTE ═══
 *
 * El ticket pedía "alternar la moneda mostrada". No se puede, y lo demuestra su propio
 * criterio 3 ("sin recalcular con una tasa distinta a la que se usó al ingerir"): una fila
 * que entró en quetzales tiene `fx_rate = 1`, o sea que NO existe una tasa congelada que la
 * exprese en dólares. Mostrar el dashboard entero en USD obligaría a inventarle una tasa a
 * esas filas.
 *
 * Así que en vez de un número falso, se muestra lo que sí es cierto: cuánto entró en cada
 * moneda —cada monto en la suya, sin sumarse entre sí— y con qué tasa se llevó a la base.
 * Es el mismo criterio que la pantalla de conceptos pendientes ya aplica.
 *
 * ═══ APARECE SOLO SI HAY DOS MONEDAS, Y LO DECIDE EL BACKEND ═══
 *
 * `multiCurrency` viene en la respuesta (criterio 4: "no agregar ruido donde no aporta"). La
 * inmensa mayoría de los clientes opera solo en quetzales y para ellos esta tarjeta no
 * existe. Se evalúa por PERÍODO: la misma empresa puede tener un mes sin dólares.
 *
 * ═══ SI LA LLAMADA FALLA, NO SE PINTA ═══
 *
 * Mismo criterio que el ranking de productos: es contexto sobre las cifras, no las cifras.
 * Y hace de consumidor tolerante mientras `/metrics/currencies` no esté desplegado — los dos
 * repos no publican a la vez.
 */
export function CurrencyNote({
  locale,
  labels,
}: {
  locale: Locale;
  labels: Dictionary['dashboard']['currency'];
}) {
  const { rango } = usePeriodScope();
  const [data, setData] = useState<CurrencyCompositionResponse | null>(null);

  const cargar = useCallback(async (r: DateRange) => {
    const res = await request<CurrencyCompositionResponse>(
      `/api/metrics-currencies?from=${r.from}&to=${r.to}`,
    );
    setData(res.ok ? res.data : null);
  }, []);

  useEffect(() => {
    void cargar(rango);
  }, [cargar, rango]);

  if (!data || !data.multiCurrency) return null;

  const base = data.baseCurrency as 'GTQ' | 'USD';
  const extranjeras = monedasExtranjeras(data);
  const propia = filaBase(data);
  if (extranjeras.length === 0) return null;

  const numero = (n: number) => formatNumber(n, locale, 4);

  return (
    <div className="rounded-lg border border-border bg-card p-[var(--density-card-p)]">
      <p className="flex items-center gap-2 font-mono text-eyebrow uppercase text-faint">
        <Coins className="h-3.5 w-3.5" strokeWidth={1.7} />
        {labels.title}
      </p>

      <p className="mt-2 text-body text-muted-foreground">
        {labels.consolidatedIn.replace('{currency}', base)}
      </p>

      <ul className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
        {propia && (
          /* La moneda base va primero y sin tasa: la suya es 1 y escribirla sería ruido. */
          <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-body tabular-nums">
              {formatMoney(propia.originalTotal, base, locale)}
            </span>
            <span className="text-micro text-faint">{labels.ownCurrency}</span>
          </li>
        )}

        {extranjeras.map((m) => {
          const r = m.rate!;
          const unica = tasaUnica(r);
          return (
            <li key={m.currency} className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-body tabular-nums">
                  {formatMoney(m.originalTotal, m.currency, locale)}
                </span>
                <span className="text-micro tabular-nums text-muted-foreground">
                  {labels.contributed.replace('{amount}', formatMoney(m.baseTotal, base, locale))}
                </span>
              </div>
              {/*
                La tasa NO va en un tooltip: el criterio 2 del ticket lo pide explícitamente
                ("visibles, no escondidas en un tooltip"), y con razón — una cifra convertida
                cuya tasa hay que ir a buscar es una cifra en la que no se puede confiar de un
                vistazo.
              */}
              <span className="font-mono text-micro tabular-nums text-faint">
                {unica
                  ? labels.rateApplied
                      .replace('{rate}', numero(r.latest))
                      .replace('{date}', formatDate(r.latestDate, locale))
                  : labels.rateRange
                      .replace('{min}', numero(r.min))
                      .replace('{max}', numero(r.max))
                      .replace('{latest}', numero(r.latest))
                      .replace('{date}', formatDate(r.latestDate, locale))}
              </span>
            </li>
          );
        })}
      </ul>

      {/*
        La frase que evita el malentendido caro: que alguien sume los montos de arriba. No se
        suman — están en monedas distintas. Lo que se consolida es el aporte de cada una.
      */}
      <p className="mt-3 text-micro text-faint">{labels.notSummed.replace('{currency}', base)}</p>
    </div>
  );
}
