'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeriodFilter } from '@/components/dashboard/period-filter';
import { KpiCard } from '@/components/charts/kpi-card';
import { CHART_HEIGHT } from '@/components/charts/chart-primitives';
import { AnalyticsKpiHeader, totalDeCartera } from '@/components/analytics/kpi-header';
import { TabCartera } from '@/components/analytics/tab-cartera';
import { useVistaDeMoneda } from '@/components/money/display-currency';
import { CurrencyToggle } from '@/components/money/currency-toggle';
import {
  carteraEnVista,
  categoriasEnVista,
  metricasEnVista,
  productosEnVista,
} from '@/lib/fx-display-shapes';
import {
  PanelCostos,
  PanelFlujo,
  PanelProductos,
  PanelTendencia,
  TablasAccesibles,
  puntosDeSerie,
} from '@/components/analytics/paneles';
import { request, type RequestError } from '@/lib/api/browser';
import { periodoInicial, type DateRange, type PeriodKey } from '@/lib/period';
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
  viewCurrencyLabels,
  role,
  common,
  rangoInicial,
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
  /* Del diccionario del dashboard y no de uno propio bajo `analytics`, por el mismo motivo
     que `kpiLabels` y `periodLabels`: es el MISMO control sobre las mismas métricas, y dos
     juegos de textos para lo mismo terminan divergiendo. */
  viewCurrencyLabels: Dictionary['dashboard']['viewCurrency'];
  /**
   * El rango del enlace (`/analytics?from=&to=`), ya validado en el SERVIDOR.
   *
   * Ausente = no venía, o venía mal y degradó a "este mes" sin error. La validación NO se
   * repite acá: un segundo criterio se separaría del primero, y sería la URL aceptando algo
   * que el selector rechaza.
   */
  rangoInicial?: DateRange;
  /**
   * Rol del usuario en la empresa activa, tal como lo devuelve `getActiveRole()` (texto libre:
   * `null` significa que la cookie de empresa activa no resolvió una membresía). Solo decide
   * qué se OFRECE; la autoridad es `settle_receivables` del backend.
   */
  role: string | null;
  common: Dictionary['common'];
}) {
  /*
   * El rango del enlace (`/analytics?from=&to=`) manda sobre el default. Ver `rangoDeLaUrl` en
   * la página: viene del SERVIDOR ya validado, así que acá no se vuelve a decidir nada — un
   * segundo criterio se separaría del primero.
   */
  const inicial = periodoInicial(rangoInicial, new Date());
  const [periodo, setPeriodo] = useState<PeriodKey>(inicial.periodo);
  const [rango, setRango] = useState<DateRange>(inicial.rango);

  // Junto al resto de los hooks: esta pantalla retorna temprano en carga, error y vacío, y un
  // hook después de un `return` cambia el orden de llamada entre renders.
  const v = useVistaDeMoneda(rango.to);
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

  /*
    ═══ LA CONVERSIÓN PASA ACÁ, EN EL BORDE, Y NO EN LOS PANELES ═══

    Esta pantalla reparte sus datos a una docena de paneles que formatean dinero por su cuenta.
    Si cada uno supiera de conversión serían doce lugares donde olvidarse de una cifra; en vez
    de eso los datos se convierten una vez al entrar y los paneles siguen recibiendo números
    con una moneda al lado, sin enterarse de nada.

    `vistaMetricas` SOMBREA a `metricas` de acá abajo y ese nombre no es casual: todo lo que se
    calcule después —los puntos de la serie, el delta, el rótulo de moneda— tiene que salir de
    la versión convertida, y dejar las dos con nombres parecidos invita a usar la equivocada.
    Lo que sigue usando `metricas` a secas es solo `pantallaVacia`, y ahí da igual: dividir por
    una tasa positiva no convierte un cero en un no-cero.

    En la vista base los conversores devuelven la MISMA referencia, así que para la inmensa
    mayoría de los clientes —que operan en una sola moneda— esto no cuesta ni un re-render.
  */
  const vistaMetricas = metricasEnVista(metricas, v.vista);
  const carteraVista = cartera
    ? {
        ...cartera,
        ar: carteraEnVista(cartera.ar, v.vista),
        ap: carteraEnVista(cartera.ap, v.vista),
      }
    : null;

  const moneda = (vistaMetricas.baseCurrency ?? 'GTQ') as 'GTQ' | 'USD';
  // CU-868ktvh75: el rango decide la granularidad. Sin él, "este año" pintaba 365 puntos.
  const puntos = puntosDeSerie(vistaMetricas.series, locale, labels, rango);
  const itemsProducto = productosEnVista(productos?.items ?? [], v.vista);
  const categoriasVista = categorias
    ? { ...categorias, rows: categoriasEnVista(categorias.rows, v.vista) }
    : null;
  const deltaIngreso = delta(vistaMetricas.current.revenue, vistaMetricas.previous.revenue);
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
      {/*
        El control de moneda va junto al de período y no arriba del todo: los dos son
        controles de VISTA sobre las mismas cifras, y separarlos haría que el de moneda
        pareciera un filtro de datos. Se envuelven en un flex que los deja lado a lado cuando
        hay ancho y apilados cuando no.
      */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {filtro}
        <CurrencyToggle locale={locale} labels={viewCurrencyLabels} v={v} />
      </div>

      <div className="flex flex-col gap-4">
        <AnalyticsKpiHeader
          metricas={vistaMetricas}
          arApTotal={carteraVista ? totalDeCartera(carteraVista.ar) : null}
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
            {/*
              ═══ CU-868ku9rpy · EL EMPAREJADO DEL RESUMEN, COMO EN EL PROTOTIPO ═══

              Antes: tendencia a ancho completo, y debajo flujo + productos al costado. El
              prototipo empareja al revés —tendencia CON productos (`lg:grid-cols-2`) y el
              flujo a ancho completo abajo— y la captura de Jose muestra por qué importa: a
              ancho completo, la curva de tendencia deja media pantalla vacía y la lista de
              productos, que es la que de verdad se lee palabra por palabra, queda relegada.

              Emparejarla con los productos llena esa fila y sube la lista al primer pliegue.
              El flujo baja a ancho completo, que es donde SÍ lo aprovecha: son dos series
              (entradas y salidas) y necesita ancho para que no se encimen.

              La proporción se mantiene en 1.35fr/1fr y no 1fr/1fr: la razón del design guide
              §4.4 sigue siendo cierta —la gráfica necesita ancho para que la curva se lea, el
              texto se defiende en menos— y el prototipo usa mitad y mitad porque su lista de
              productos trae barras de progreso que ocupan más que nuestro texto.
            */}
            <div className="grid grid-cols-1 gap-4 app:grid-cols-[1.35fr_1fr]">
              <PanelTendencia
                metricas={vistaMetricas}
                puntos={puntos}
                moneda={moneda}
                locale={locale}
                labels={labels}
                kpiLabels={kpiLabels}
                deltaIngreso={deltaIngreso}
              />
              <PanelProductos
                items={itemsProducto}
                moneda={moneda}
                locale={locale}
                labels={labels}
              />
            </div>
            <PanelFlujo puntos={puntos} moneda={moneda} locale={locale} labels={labels} />
          </TabsContent>

          <TabsContent value="revenue" className="mt-4 flex flex-col gap-4">
            {/*
              La tendencia manda en su propio tab, y eso lo gana por el ANCHO —los productos
              pasan abajo en vez de al costado—, no estirándose hacia abajo.

              Acá decía "va más alta que en el Resumen" y era `h-96` (384px). El prototipo no
              tiene ninguna área por encima de 260px, y esa era la gráfica de la captura de
              Jose: 384px con los mismos datos es una forma un 60 % más alta. Ver la tabla de
              medición en `chart-primitives.tsx`.
            */}
            <PanelTendencia
              metricas={vistaMetricas}
              puntos={puntos}
              moneda={moneda}
              locale={locale}
              labels={labels}
              kpiLabels={kpiLabels}
              deltaIngreso={deltaIngreso}
              alto={CHART_HEIGHT.areaWide}
            />
            <PanelProductos items={itemsProducto} moneda={moneda} locale={locale} labels={labels} />
          </TabsContent>

          <TabsContent value="cashFlow" className="mt-4 flex flex-col gap-4">
            <PanelFlujo
              puntos={puntos}
              moneda={moneda}
              locale={locale}
              labels={labels}
              alto={CHART_HEIGHT.areaWide}
              // El neto solo se corona en SU tab: en el Resumen la cifra ancla es el ingreso,
              // y dos números grandes compitiendo en la misma vista no dejan ancla a ninguno.
              resumen={{ neto: resultado(vistaMetricas.current) }}
            />
          </TabsContent>

          <TabsContent value="costs" className="mt-4 flex flex-col gap-4">
            <PanelCostos
              categorias={categoriasVista}
              moneda={moneda}
              locale={locale}
              labels={labels}
            />
          </TabsContent>

          <TabsContent value="receivables" className="mt-4">
            <TabCartera
              buckets={carteraVista?.ar ?? null}
              concentracion={contrapartes?.ar ?? null}
              cara="ar"
              role={role}
              onCambio={() => void cargarPeriodo(rango)}
              moneda={moneda}
              locale={locale}
              labels={labels}
              common={common}
              vacio={labels.arAp.emptyAr}
              titulo={labels.tabs.receivables}
            />
          </TabsContent>

          <TabsContent value="payables" className="mt-4">
            <TabCartera
              buckets={carteraVista?.ap ?? null}
              concentracion={contrapartes?.ap ?? null}
              cara="ap"
              role={role}
              onCambio={() => void cargarPeriodo(rango)}
              moneda={moneda}
              locale={locale}
              labels={labels}
              common={common}
              vacio={labels.arAp.emptyAp}
              titulo={labels.tabs.payables}
            />
          </TabsContent>
        </Tabs>

        {/* FUERA de los tabs: un tab cerrado de Radix no se renderiza, así que adentro estas
            tablas desaparecerían según qué tab esté abierto — y la accesibilidad de una
            pantalla no puede depender de eso. */}
        <TablasAccesibles
          metricas={vistaMetricas}
          items={itemsProducto}
          moneda={moneda}
          locale={locale}
          labels={labels}
        />
      </div>
    </>
  );
}
