import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { AnalyticsClient } from '@/components/analytics/analytics-client';
import { getActiveRole } from '@/lib/auth/active-role';
import { validateCustomRange, type DateRange } from '@/lib/period';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * EL RANGO DE LA URL (`?from=&to=`) — 2026-09-01
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * La pantalla abría SIEMPRE en "este mes" y descartaba en silencio el rango del enlace, así
 * que un `/analytics?from=…&to=…` llevaba a un período distinto del que promete. Es el mismo
 * daño que `hayDatosFueraDelRango` documenta y costó un día entero: el cliente ve cifras
 * correctas de OTRO período y concluye que el sistema no leyó su archivo.
 *
 * Se lee en el SERVIDOR y baja como estado inicial, igual que el `?doc=` de `/upload`: leído
 * en el cliente, quien abre el enlace vería primero el mes en curso y después un salto.
 *
 * Un rango inválido —incompleto, invertido o futuro— degrada a "este mes" **sin error**, con
 * el mismo criterio que un `?doc=` que ya no existe: un enlace de hace tres días no puede
 * terminar en una pantalla rota. Se valida con `validateCustomRange`, la MISMA función que usa
 * el selector, para que la URL y el formulario no acepten cosas distintas.
 */
function rangoDeLaUrl(sp: Record<string, string | string[] | undefined>): DateRange | undefined {
  const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const from = uno(sp.from);
  const to = uno(sp.to);
  if (validateCustomRange(from, to, new Date()) !== null) return undefined;
  return { from, to };
}

/**
 * Analítica — una de las tres pantallas del prototipo MVP Macha que existían en la maqueta
 * y no en la app. Server component: resuelve idioma, textos y el rango del enlace; el período
 * cambia después con un clic y sin recargar, así que ese estado vive en el cliente.
 */
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const locale = getLocale();
  const t = getDictionary(locale);
  /*
   * El rol se resuelve en el SERVIDOR y baja como prop: `getActiveRole()` lleva `server-only` y
   * el cliente de Analítica no puede importarlo. No es autorización —la autoridad es la
   * capacidad `settle_receivables` del backend— sino no ofrecer un botón que daría 403.
   */
  const role = await getActiveRole();

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <PageHeader icon={BarChart3} title={t.analytics.title} />
      <AnalyticsClient
        locale={locale}
        labels={t.analytics}
        // Los textos de KPI se toman del dashboard, no se duplican bajo `analytics`: son
        // las mismas métricas del mismo endpoint, y dos juegos de etiquetas para lo mismo
        // acaban divergiendo. Mismo criterio que `periodLabels`, que ya venía de ahí.
        kpiLabels={t.dashboard.kpi}
        periodLabels={t.dashboard.period}
        viewCurrencyLabels={t.dashboard.viewCurrency}
        role={role}
        common={t.common}
        rangoInicial={rangoDeLaUrl(searchParams)}
      />
    </main>
  );
}
