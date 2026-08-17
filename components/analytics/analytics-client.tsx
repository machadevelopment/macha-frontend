'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeriodFilter } from '@/components/dashboard/period-filter';
import { KpiCard } from '@/components/charts/kpi-card';
import { AnalyticsKpiHeader, totalDeCartera } from '@/components/analytics/kpi-header';
import { TabCartera } from '@/components/analytics/tab-cartera';
import {
  PanelCostos,
  PanelFlujo,
  PanelProductos,
  PanelTendencia,
  TablasAccesibles,
  puntosDeSerie,
} from '@/components/analytics/paneles';
import { request, type RequestError } from '@/lib/api/browser';
import { computeRange, type DateRange, type PeriodKey } from '@/lib/period';
import { delta, resultado } from '@/lib/metrics/period-totals';
import { pantallaVacia } from '@/components/analytics/vacio';
import type {
  ArApCounterpartiesResponse,
  ArApResponse,
  CategoryBreakdownResponse,
  PeriodMetricsResponse,
  ProductRevenueResponse,
} from '@/lib/api/dashboard';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * Analítica: los seis tabs del prototipo sobre un mismo período — CU-868kt29t0.
 *
 * ═══ TODO CUELGA DE UN SOLO RANGO ═══
 *
 * El estado del período vive acá y no en cada tab. Si cada uno pidiera el suyo, la tendencia
 * podría estar mostrando el año mientras el desglose de costos muestra el mes, sin nada en
 * pantalla que lo delate — el usuario compararía dos números que no son comparables y no
 * tendría cómo saberlo.
 *
 * Por la misma razón el filtro y la fila de KPIs quedan FUERA de los tabs: son las cifras
 * ancla de la pantalla, y que desaparezcan al cambiar de tab obligaría a volver al primero
 * cada vez que alguien quiere recordar de cuánto dinero se está hablando.
 *
 * ═══ QUÉ SE PIDE, Y CUÁNDO ═══
 *
 * Cinco lecturas, y NO todas al mismo tiempo:
 *
 *   · las tres del período (`/metrics-period`, `-categories`, `-products`) salen juntas al
 *     cargar y en cada cambio de filtro, porque casi todos los tabs dependen de ellas;
 *   · las dos de cartera (`/ar-ap`, `/ar-ap/counterparties`) salen UNA vez y **no dependen
 *     del período** — ver abajo. `/ar-ap` va desde el arranque porque su total es uno de los
 *     seis KPIs del encabezado; la concentración se pide al abrir su tab por primera vez y
 *     se queda: son dos agregaciones por contraparte que no tiene sentido pagar si el
 *     usuario nunca abre esos tabs.
 *
 * Solo `/metrics-period` es bloqueante: de ahí salen los KPIs y casi todas las gráficas. Si
 * cualquiera de las otras falla, su panel queda vacío y la pantalla sigue sirviendo.
 *
 * ═══ LA CARTERA NO RESPETA EL FILTRO, Y ESO SE DICE EN PANTALLA ═══
 *
 * La cartera abierta es ESTADO VIVO: una factura de marzo que sigue sin cobrarse es plata que
 * le deben hoy, aunque el filtro diga "este mes". Filtrarla por el período la esconderría
 * justo cuando más importa. `TabCartera` lleva la leyenda que lo explica — sin ella, ver las
 * mismas cifras al mover el filtro se lee como un filtro roto.
 *
 * ═══ ACABADO ═══
 *
 * Zona "producto" del design guide §2.7: el color de los datos es el FUNCIONAL
 * (`success`/`danger`/`warning`), y el salvia de marca no aparece en esta pantalla ni una
 * vez. Las cifras van en la tipografía de interfaz con `tabular-nums`, no en monoespaciada.
 */

type TabKey = 'overview' | 'revenue' | 'cashFlow' | 'costs' | 'receivables' | 'payables';

export function AnalyticsClient({
  locale,
  labels,
  kpiLabels,
  periodLabels,
  common,
}: {
  locale: Locale;
  labels: Dictionary['analytics'];
  /**
   * Se reutilizan los textos de KPI del dashboard en vez de duplicarlos bajo `analytics`:
   * son las mismas métricas del mismo endpoint, y dos juegos de etiquetas para lo mismo
   * terminan diciendo "Gastos" en una pantalla y "Egresos" en la otra.
   */
  kpiLabels: Dictionary['dashboard']['kpi'];
  periodLabels: Dictionary['dashboard']['period'];
  common: Dictionary['common'];
}) {
  const [periodo, setPeriodo] = useState<PeriodKey>('month');
  const [rango, setRango] = useState<DateRange>(() => computeRange('month', new Date()));
  const [tab, setTab] = useState<TabKey>('overview');

  const [metricas, setMetricas] = useState<PeriodMetricsResponse | null>(null);
  const [categorias, setCategorias] = useState<CategoryBreakdownResponse | null>(null);
  const [productos, setProductos] = useState<ProductRevenueResponse | null>(null);
  const [cartera, setCartera] = useState<ArApResponse | null>(null);
  const [contrapartes, setContrapartes] = useState<ArApCounterpartiesResponse | null>(null);
  const [error, setError] = useState<RequestError | null>(null);

  const cargarPeriodo = useCallback(async (r: DateRange) => {
    setError(null);
    const [m, c, p] = await Promise.all([
      request<PeriodMetricsResponse>(`/api/metrics-period?from=${r.from}&to=${r.to}`),
      request<CategoryBreakdownResponse>(`/api/metrics-categories?from=${r.from}&to=${r.to}`),
      request<ProductRevenueResponse>(`/api/metrics-products?from=${r.from}&to=${r.to}&limit=8`),
    ]);
    if (!m.ok) {
      setError(m.error);
      return;
    }
    setMetricas(m.data);
    // Secundarias: si fallan, su panel queda vacío pero la pantalla sirve.
    setCategorias(c.ok ? c.data : null);
    setProductos(p.ok ? p.data : null);
  }, []);

  useEffect(() => {
    void cargarPeriodo(rango);
  }, [cargarPeriodo, rango]);

  // La cartera va aparte y SIN el rango en las dependencias: no depende del período, así que
  // volver a pedirla en cada cambio de filtro serían dos consultas por nada.
  useEffect(() => {
    void request<ArApResponse>('/api/ar-ap').then((r) => {
      if (r.ok) setCartera(r.data);
    });
  }, []);

  // La concentración se pide al abrir su tab por primera vez, y se queda. `contrapartes` en
  // las dependencias es lo que hace que sea UNA vez y no una por cada vuelta al tab.
  useEffect(() => {
    if (tab !== 'receivables' && tab !== 'payables') return;
    if (contrapartes) return;
    void request<ArApCounterpartiesResponse>('/api/ar-ap-counterparties?limit=10').then((r) => {
      if (r.ok) setContrapartes(r.data);
    });
  }, [tab, contrapartes]);

  const filtro = (
    <PeriodFilter
      value={periodo}
      range={rango}
      onChange={(key, r) => {
        setPeriodo(key);
        setRango(r);
      }}
      locale={locale}
      labels={periodLabels}
    />
  );

  if (error) {
    return (
      <>
        <div className="mb-4">{filtro}</div>
        <Card>
          <LoadError
            error={error}
            labels={common.loadError}
            onRetry={() => void cargarPeriodo(rango)}
          />
        </Card>
      </>
    );
  }

  // Estado de carga explícito: antes la pantalla pintaba charts vacíos mientras llegaba la
  // respuesta, que se ve igual que "no tienes datos". Son cosas distintas y el usuario no
  // tenía cómo distinguirlas.
  if (!metricas) {
    return (
      <div className="flex flex-col gap-4">
        {filtro}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 app:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <KpiCard key={i} label="" value="" loading />
          ))}
        </div>
        <Card>
          <div className="h-80" aria-busy="true" />
        </Card>
      </div>
    );
  }

  const moneda = (metricas.baseCurrency ?? 'GTQ') as 'GTQ' | 'USD';
  const puntos = puntosDeSerie(metricas.series, locale, labels);
  const itemsProducto = productos?.items ?? [];
  const deltaIngreso = delta(metricas.current.revenue, metricas.previous.revenue);
  /*
   * "No hay nada" se decide con el período Y con la cartera — ver `vacio.ts`. Una empresa sin
   * movimientos este mes pero con facturas por cobrar de meses anteriores NO ve el mensaje:
   * esconderle los tabs de cartera justo ahí le oculta lo único accionable que le queda.
   */
  if (pantallaVacia({ serie: metricas.series, cartera })) {
    return (
      <>
        <div className="mb-4">{filtro}</div>
        <Card>
          <p className="text-body text-muted-foreground">{labels.empty}</p>
          <p className="mt-1 text-body text-faint">{labels.emptyHint}</p>
        </Card>
      </>
    );
  }

  const tabs: Array<[TabKey, string]> = [
    ['overview', labels.tabs.overview],
    ['revenue', labels.tabs.revenue],
    ['cashFlow', labels.tabs.cashFlow],
    ['costs', labels.tabs.costs],
    ['receivables', labels.tabs.receivables],
    ['payables', labels.tabs.payables],
  ];

  return (
    <>
      <div className="mb-4">{filtro}</div>

      <div className="flex flex-col gap-4">
        <AnalyticsKpiHeader
          metricas={metricas}
          arApTotal={cartera ? totalDeCartera(cartera.ar) : null}
          locale={locale}
          labels={labels}
          kpiLabels={kpiLabels}
        />

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          {/* Con seis tabs la lista se sale de una pantalla angosta: se desplaza sola en vez
              de partirse en dos filas o de empujar el ancho del cuerpo de la página. */}
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList>
              {tabs.map(([key, texto]) => (
                <TabsTrigger key={key} value={key}>
                  {texto}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-4 flex flex-col gap-4">
            <PanelTendencia
              metricas={metricas}
              puntos={puntos}
              moneda={moneda}
              locale={locale}
              labels={labels}
              kpiLabels={kpiLabels}
              deltaIngreso={deltaIngreso}
            />
            {/* `g-side` del design guide §4.4 (1.35fr / 1fr): la gráfica necesita ancho para
                que la curva se lea; la lista de productos es texto y se defiende en menos. */}
            <div className="grid grid-cols-1 gap-4 app:grid-cols-[1.35fr_1fr]">
              <PanelFlujo puntos={puntos} moneda={moneda} locale={locale} labels={labels} />
              <PanelProductos
                items={itemsProducto}
                moneda={moneda}
                locale={locale}
                labels={labels}
              />
            </div>
          </TabsContent>

          <TabsContent value="revenue" className="mt-4 flex flex-col gap-4">
            {/* La tendencia manda en su propio tab, así que va más alta que en el Resumen, y
                los productos pasan a ancho completo en vez de al costado. */}
            <PanelTendencia
              metricas={metricas}
              puntos={puntos}
              moneda={moneda}
              locale={locale}
              labels={labels}
              kpiLabels={kpiLabels}
              deltaIngreso={deltaIngreso}
              alto="h-96"
            />
            <PanelProductos items={itemsProducto} moneda={moneda} locale={locale} labels={labels} />
          </TabsContent>

          <TabsContent value="cashFlow" className="mt-4 flex flex-col gap-4">
            <PanelFlujo
              puntos={puntos}
              moneda={moneda}
              locale={locale}
              labels={labels}
              alto="h-96"
              // El neto solo se corona en SU tab: en el Resumen la cifra ancla es el ingreso,
              // y dos números grandes compitiendo en la misma vista no dejan ancla a ninguno.
              resumen={{ neto: resultado(metricas.current) }}
            />
          </TabsContent>

          <TabsContent value="costs" className="mt-4 flex flex-col gap-4">
            <PanelCostos categorias={categorias} moneda={moneda} locale={locale} labels={labels} />
          </TabsContent>

          <TabsContent value="receivables" className="mt-4">
            <TabCartera
              buckets={cartera?.ar ?? null}
              concentracion={contrapartes?.ar ?? null}
              moneda={moneda}
              locale={locale}
              labels={labels}
              vacio={labels.arAp.emptyAr}
              titulo={labels.tabs.receivables}
            />
          </TabsContent>

          <TabsContent value="payables" className="mt-4">
            <TabCartera
              buckets={cartera?.ap ?? null}
              concentracion={contrapartes?.ap ?? null}
              moneda={moneda}
              locale={locale}
              labels={labels}
              vacio={labels.arAp.emptyAp}
              titulo={labels.tabs.payables}
            />
          </TabsContent>
        </Tabs>

        {/* FUERA de los tabs: un tab cerrado de Radix no se renderiza, así que adentro estas
            tablas desaparecerían según qué tab esté abierto — y la accesibilidad de una
            pantalla no puede depender de eso. */}
        <TablasAccesibles
          metricas={metricas}
          items={itemsProducto}
          moneda={moneda}
          locale={locale}
          labels={labels}
        />
      </div>
    </>
  );
}
