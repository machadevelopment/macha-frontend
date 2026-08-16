'use client';

import { useCallback, useEffect, useState } from 'react';
import { DollarSign, Receipt, PiggyBank, Percent, Wallet } from 'lucide-react';
import { KpiCard } from '@/components/charts/kpi-card';
import { LoadError } from '@/components/ui/load-error';
import { PeriodFilter } from '@/components/dashboard/period-filter';
import { usePeriodScope } from '@/components/dashboard/period-scope';
import { request, type RequestError } from '@/lib/api/browser';
import type { DateRange } from '@/lib/period';
import { formatMoney, formatMoneyCompact, formatPct } from '@/lib/format';
import { delta, gastos, margenBruto, resultado, utilidadBruta } from '@/lib/metrics/period-totals';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';
import { TopProductCard } from '@/components/dashboard/top-product-card';
import type {
  PeriodMetricsResponse,
  PeriodTotals,
  ProductRevenueResponse,
} from '@/lib/api/dashboard';

/**
 * Filtro de período + las cinco tarjetas, sobre el rango elegido.
 *
 * Sustituye al `KpiRow` de serie mensual fija, que se elimina en este mismo cambio:
 * aquel siempre mostraba el último mes cerrado, así que las píldoras no habrían
 * cambiado ningún número y el filtro habría sido decorativo. El estado del período
 * vive acá —y no en la página, que es un componente de servidor— porque cambia con un
 * clic y sin recargar.
 *
 * Los deltas se calculan contra `previous`, la ventana del MISMO tamaño inmediatamente
 * anterior que devuelve el backend. No se compara contra "el mes pasado" a secas: para
 * "hoy" eso sería absurdo.
 *
 * CU-868krkqh2: el estado del período ya NO vive acá, vive en `PeriodScope`. El saludo del
 * dashboard también lo necesita y está en otra rama del árbol; ver la cabecera de
 * `period-scope.tsx`. Este componente sigue siendo quien MONTA el filtro — solo que ahora
 * escribe en el contexto en vez de en un `useState` propio.
 */
export function PeriodKpis({
  locale,
  labels,
  common,
}: {
  locale: Locale;
  labels: Dictionary['dashboard'];
  common: Dictionary['common'];
}) {
  const { periodo, rango, cambiar } = usePeriodScope();
  const [data, setData] = useState<PeriodMetricsResponse | null>(null);
  const [productos, setProductos] = useState<ProductRevenueResponse | null>(null);
  const [error, setError] = useState<RequestError | null>(null);

  const cargar = useCallback(async (r: DateRange) => {
    setError(null);
    // Las dos llamadas van en paralelo y comparten el MISMO rango: si el ranking de
    // productos pidiera el suyo por separado, las píldoras dirían "hoy" y la tarjeta
    // seguiría mostrando el mes.
    const [metricas, prods] = await Promise.all([
      request<PeriodMetricsResponse>(`/api/metrics-period?from=${r.from}&to=${r.to}`),
      request<ProductRevenueResponse>(`/api/metrics-products?from=${r.from}&to=${r.to}&limit=5`),
    ]);
    if (!metricas.ok) {
      setError(metricas.error);
      return;
    }
    setData(metricas.data);
    // El ranking es secundario: si falla, la pantalla sigue sirviendo sus KPIs en vez
    // de caerse entera por una tarjeta lateral.
    setProductos(prods.ok ? prods.data : null);
  }, []);

  useEffect(() => {
    void cargar(rango);
  }, [cargar, rango]);

  /**
   * Cinco columnas SOLO desde 1536px, no desde 1280.
   *
   * El rail derecho del dashboard son 348px fijos, así que la columna de los KPIs es mucho más
   * angosta que el viewport: a 1280px quedan ~616px para las tarjetas, y cinco ahí son 110px
   * útiles cada una — no cabe ni un monto abreviado. El escalón nuevo (2→3→5) mantiene las
   * tarjetas sobre ~170px útiles en todo el rango.
   *
   * Son breakpoints de viewport y no container queries porque Tailwind 3.4 no las trae en el
   * core; el ancho del rail es fijo, así que la cuenta desde el viewport es determinista.
   */
  const GRID = 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5';

  const filtro = (
    <PeriodFilter
      value={periodo}
      range={rango}
      onChange={cambiar}
      locale={locale}
      labels={labels.period}
    />
  );

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        {filtro}
        <LoadError error={error} labels={common.loadError} onRetry={() => void cargar(rango)} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-3">
        {filtro}
        <div className={GRID}>
          {[0, 1, 2, 3, 4].map((i) => (
            <KpiCard key={i} label="" value="" loading />
          ))}
        </div>
      </div>
    );
  }

  const moneda = data.baseCurrency as 'GTQ' | 'USD';

  // Las cuentas viven en `lib/metrics/period-totals` desde CU-868knx15v: Analítica monta su
  // propia fila de KPIs sobre los mismos totales, y dos copias de "gastos = cogs + opex" son
  // dos números distintos esperando a que alguien toque una sola.
  const margen = margenBruto(data.current);

  const serie = (f: (t: PeriodTotals) => number) => data.series.map(f);

  return (
    <div className="flex flex-col gap-3">
      {filtro}
      <div className={GRID}>
        {/*
          Valor ABREVIADO arriba y cifra EXACTA debajo, que es para lo que existe `exact` y lo
          que hace el prototipo. No es una preferencia estética: `formatMoney` produce
          `GTQ 480,663.00` (~192px a 24px en JetBrains Mono) y la tarjeta tiene ~170px útiles,
          así que el monto completo NO cabe y con datos reales se desbordaba sobre la tarjeta
          vecina. La notación compacta corta en ~9 caracteres y no vuelve a crecer aunque el
          número gane dígitos.
        */}
        <KpiCard
          label={labels.kpi.revenue}
          icon={<DollarSign className="h-4 w-4" strokeWidth={1.7} />}
          value={formatMoneyCompact(data.current.revenue, moneda, locale)}
          exact={formatMoney(data.current.revenue, moneda, locale)}
          hint={labels.kpi.revenueHint}
          delta={delta(data.current.revenue, data.previous.revenue)}
          deltaCaption={labels.kpi.vsPrevious}
          spark={serie((t) => t.revenue)}
          locale={locale}
        />
        <KpiCard
          label={labels.kpi.expenses}
          icon={<Receipt className="h-4 w-4" strokeWidth={1.7} />}
          value={formatMoneyCompact(gastos(data.current), moneda, locale)}
          exact={formatMoney(gastos(data.current), moneda, locale)}
          hint={labels.kpi.expensesHint}
          delta={delta(gastos(data.current), gastos(data.previous))}
          deltaCaption={labels.kpi.vsPrevious}
          spark={serie(gastos)}
          invertDelta
          locale={locale}
        />
        <KpiCard
          label={labels.kpi.grossProfit}
          icon={<PiggyBank className="h-4 w-4" strokeWidth={1.7} />}
          value={formatMoneyCompact(utilidadBruta(data.current), moneda, locale)}
          exact={formatMoney(utilidadBruta(data.current), moneda, locale)}
          hint={labels.kpi.grossProfitHint}
          delta={delta(utilidadBruta(data.current), utilidadBruta(data.previous))}
          deltaCaption={labels.kpi.vsPrevious}
          spark={serie(utilidadBruta)}
          locale={locale}
        />
        <KpiCard
          label={labels.kpi.margin}
          icon={<Percent className="h-4 w-4" strokeWidth={1.7} />}
          value={margen === null ? '—' : formatPct(margen, locale)}
          hint={labels.kpi.marginHint}
          locale={locale}
        />
        <KpiCard
          label={labels.kpi.cashFlow}
          icon={<Wallet className="h-4 w-4" strokeWidth={1.7} />}
          value={formatMoneyCompact(resultado(data.current), moneda, locale)}
          exact={formatMoney(resultado(data.current), moneda, locale)}
          hint={labels.kpi.cashFlowHint}
          delta={delta(resultado(data.current), resultado(data.previous))}
          deltaCaption={labels.kpi.vsPrevious}
          spark={serie(resultado)}
          locale={locale}
        />
      </div>
      <TopProductCard
        data={productos}
        hayVentas={data.current.revenue > 0}
        locale={locale}
        labels={labels.topProduct}
      />
    </div>
  );
}
