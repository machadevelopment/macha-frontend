'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { request } from '@/lib/api/browser';
import { useResource } from '@/lib/api/use-resource';
import { formatMoney } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { ArApResponse } from '@/lib/api/dashboard';
import { chartColors } from '@/components/charts/chart-theme';
import { CategoryBars } from '@/components/charts/chart-primitives';

const BUCKET_ORDER = ['current', '1_30', '31_60', '61_90', '90_plus'] as const;

export function ArApChart({
  locale,
  title,
  arLabel,
  apLabel,
  agingLabel,
  common,
}: {
  locale: Locale;
  title: string;
  arLabel: string;
  apLabel: string;
  /** CU-868kh8rz8: cabecera de la tabla `sr-only`, hardcodeada en español por el PR #19. */
  agingLabel: string;
  common: Dictionary['common'];
}) {
  const { state, reload } = useResource<ArApResponse>(() => request<ArApResponse>('/api/ar-ap'));

  // CU-868kkgb3c: ver nota en trend-chart.tsx — la tarjeta no desaparece, falla adentro.
  if (state.status !== 'ready') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        {state.status === 'error' ? (
          <LoadError error={state.error} labels={common.loadError} onRetry={reload} />
        ) : (
          <div className="h-64" aria-busy="true" />
        )}
      </Card>
    );
  }

  const data = state.data;
  const currency = data.baseCurrency as 'GTQ' | 'USD';

  /*
   * CU-868kt2eh8 — los tramos se ETIQUETAN, no se muestran crudos.
   *
   * El eje decía `1_30`, `31_60`, `90_plus`: las claves que manda el backend, tal cual.
   * Macha lo reportó textual — "no se entiende qué son los números de abajo". Y con razón:
   * ni el guion bajo ni el rango sin unidad dicen que son DÍAS DE VENCIMIENTO.
   *
   * Los rótulos salen de `common.agingBucket`, que comparten esta gráfica y los tabs de
   * cartera de Analítica. Con dos copias, una diría "1–30 días" y la otra "1 a 30 días" —
   * que es de donde viene este ticket.
   *
   * `etiqueta` reemplaza a `bucket` como índice del chart: Tremor pinta el eje X con el
   * valor de esa clave, así que la traducción tiene que pasar acá y no en un formateador
   * del eje (ver la nota de `chart-theme.ts` sobre por qué las props de estilo no llegan
   * al SVG). `bucket` se conserva en la fila para la tabla accesible y para las claves.
   */
  const chartData = BUCKET_ORDER.map((bucket) => ({
    bucket,
    etiqueta: common.agingBucket[bucket],
    [arLabel]: data.ar[bucket],
    [apLabel]: data.ap[bucket],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {/* CU-868kt2eh8: qué representa el eje. Sin esta línea las barras son montos sin
          unidad — el usuario ve cifras agrupadas y no sabe que el criterio son los días
          que llevan vencidas. */}
      <p className="text-body text-muted-foreground">{common.agingAxisLabel}</p>
      {/* CU-868knx0vh: ver nota en trend-chart.tsx. Barras y no área porque el eje X acá
          no es tiempo sino tramos de antigüedad — una curva entre "31-60" y "61-90"
          sugeriría una continuidad que no existe. Lo que sí se comparte con la tendencia
          es el cromo: eje, grid, cursor y leyenda salen del mismo lugar. */}
      {/*
        CU-868krkcwn — POR COBRAR VA EN VERDE FUNCIONAL, NO EN NEUTRO.

        Iba `chartColors.neutral` y fallaba las dos mitades de la regla de los dos verdes
        (design guide §2.6): decía NADA donde el dato sí tiene signo —lo que entra frente a
        lo que sale— y además desaparecía. En la captura que reportó Macha la serie roja de
        "Payable" domina el chart y la de "Receivable" es un hilo gris de 3px sobre el
        lienzo blanco: el gris neutro de Tremor sobre `--background` no tiene contraste
        suficiente para leerse como una barra.

        El salvia de marca NO es la respuesta: es identidad, no señal, y sobre un dato está
        prohibido. El verde funcional (`emerald`) sí, y hace par con el rojo que ya lleva
        "Payable".

        MATIZ QUE SE ACEPTA A SABIENDAS: una cuenta por cobrar de 90+ días no es una buena
        noticia. Pero el color acá califica la SERIE (dinero que entra vs. dinero que sale),
        que es lo que dice la leyenda; la alarma por antigüedad la lleva el eje X, que ya
        ordena los tramos de reciente a vencido. Pintar cada barra según su tramo mezclaría
        las dos lecturas en un solo canal.

        Los dos colores ya están en el `safelist` de tailwind.config.ts (emerald y rose), así
        que este cambio no necesita tocarlo — si algún día se agrega un tercero, sí.
      */}
      <CategoryBars
        data={chartData}
        index="etiqueta"
        categories={[arLabel, apLabel]}
        colors={[chartColors.positive, chartColors.negative]}
        currency={currency}
        locale={locale}
        yAxisWidth={72}
        className="h-64"
        showLegend
      />
      {/* Alternativa accesible: el SVG del chart no expone los valores a lectores de
          pantalla — CU-868kfvaz9. */}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>{agingLabel}</th>
            <th>{arLabel}</th>
            <th>{apLabel}</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((row) => (
            <tr key={row.bucket}>
              {/* La clave cruda tampoco sirve para un lector de pantalla: "guion bajo
                  treinta" no es un tramo de antigüedad. */}
              <td>{row.etiqueta}</td>
              <td>{formatMoney(row[arLabel] as number, currency, locale)}</td>
              <td>{formatMoney(row[apLabel] as number, currency, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
