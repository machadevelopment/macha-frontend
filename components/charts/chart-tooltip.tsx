'use client';

import type { CustomTooltipProps } from '@tremor/react';
import { formatMoney } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';

/**
 * CU-868khvyqa: tooltip compartido de los charts del dashboard.
 *
 * Existe porque `valueFormatter` de Tremor alimenta **el eje Y y el tooltip a la vez**.
 * El eje necesita la forma compacta (`GTQ 145 k`) para no recortarse, pero el tooltip es
 * donde el usuario va a leer la cifra: ahí tiene que estar el monto completo con su
 * código de moneda explícito. Este componente rompe ese empate — eje compacto,
 * tooltip exacto.
 *
 * Los colores del punto de cada serie vienen del propio payload de Recharts (`color`),
 * así que no se hardcodea ninguno: sigue la misma paleta que las series del chart.
 */
/**
 * De qué se compone una de las series, para poder reconciliarla — bug de Jose (2026-08-26).
 *
 * Reportó que las salidas de Analítica "no coinciden con el Excel". **El número era correcto**
 * (verificado contra producción: el 5 de agosto de Gym Supplements son GTQ 10.780,52), pero
 * "Salidas" suma costo de ventas y gasto operativo, y en el Excel del cliente esas dos cosas
 * viven en hojas distintas. Comparó la cifra con la nómina —10.306,41— y los 474,11 de
 * diferencia eran costo de ventas.
 *
 * La serie sigue dibujando UNA línea de salidas, que es lo correcto: así sale el dinero de la
 * cuenta, y partirla en dos contestaría otra pregunta. Lo que cambia es que el tooltip diga de
 * qué está hecha, que es lo único que faltaba para poder cuadrarla.
 *
 * Las claves apuntan a campos del punto de datos que el chart NO dibuja: Tremor solo pinta las
 * series de `categories`, así que llevarlos en el mismo objeto no agrega ninguna línea.
 */
export interface DesgloseDeSerie {
  /** Nombre de la serie a desglosar, tal como aparece en `categories`. */
  serie: string;
  partes: Array<{ etiqueta: string; clave: string }>;
}

export function makeChartTooltip(
  currency: 'GTQ' | 'USD',
  locale: Locale,
  desglose?: DesgloseDeSerie,
) {
  return function ChartTooltip({ payload, active, label }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;

    /*
     * El punto de datos completo, con los campos que el chart no dibuja. Recharts lo cuelga de
     * cada entrada del payload; si algún día dejara de hacerlo, `partes` queda vacío y el
     * tooltip se comporta como antes en vez de romperse.
     */
    const punto = (payload[0] as { payload?: Record<string, unknown> }).payload ?? {};

    return (
      <div className="rounded-md border border-border bg-card px-3 py-2 shadow-tab">
        <p className="font-mono text-eyebrow uppercase text-faint">{label}</p>
        <div className="mt-1 flex flex-col gap-1">
          {payload.map((entry, i) => {
            const partes =
              desglose && entry.name === desglose.serie
                ? desglose.partes.filter((p) => typeof punto[p.clave] === 'number')
                : [];
            return (
              <div key={i} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-body">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    {entry.name}
                  </span>
                  <span className="tabular-nums text-body">
                    {formatMoney(Number(entry.value ?? 0), currency, locale)}
                  </span>
                </div>
                {/*
                  Sangrado al ancho del punto de color y en `micro`: son las PARTES de la cifra
                  de arriba, no series propias. Si se pintaran al mismo nivel, el tooltip
                  parecería tener cuatro series y la suma no cerraría con las dos líneas.
                */}
                {partes.map((parte) => (
                  <div key={parte.clave} className="flex items-center justify-between gap-4 pl-3.5">
                    <span className="text-micro text-muted-foreground">{parte.etiqueta}</span>
                    <span className="tabular-nums text-micro text-muted-foreground">
                      {formatMoney(Number(punto[parte.clave]), currency, locale)}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };
}
