import {
  AlertTriangle,
  BarChart3,
  Bot,
  Boxes,
  Building2,
  CreditCard,
  FileText,
  Layers,
  LayoutGrid,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  UploadCloud,
  Users,
  Inbox,
  type LucideIcon,
} from 'lucide-react';
import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * Modelo de navegación del shell (CU-868khvynk).
 *
 * Vive fuera de `app-shell.tsx` para que la app de cliente y el backoffice compartan
 * el MISMO componente de shell y se diferencien solo por estos datos — design guide.md
 * §12: "el backoffice se diferencia por la superficie inversa del orgbar y densidad
 * compacta, no por otra identidad". Dos navs distintas era justo lo que había antes.
 *
 * Los íconos salen del mapeo de design guide.md §6 (`grid→LayoutGrid`, `doc→FileText`,
 * `bot→Bot`, `up→UploadCloud`, `card→CreditCard`, `bldg→Building2`, `alert→AlertTriangle`,
 * `box→Package`, `gear→Settings`, `spark→Sparkles`). Los tres de las pantallas nuevas
 * (`BarChart3`, `ShoppingCart`, `Boxes`) se toman tal cual del prototipo MVP Macha: son
 * los que el dueño ya vio en la maqueta, y cambiarlos por otros del mapeo no ganaría nada.
 */
export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  /**
   * Coincidencia exacta en vez de por prefijo. Necesario para las raíces que son
   * prefijo de todo lo demás (`/admin`), o si no salen siempre activas.
   */
  exact?: boolean;
  /**
   * Badge de contador (design guide.md §8: "filas por revisar, alertas").
   *
   * **Diferido a propósito, no olvidado.** CU-868kj0tdq criterio 6 pedía decidir entre
   * badge de contador o "últimas N alertas" en el dashboard. La decisión es **ninguna
   * de las dos, por ahora**, y el motivo es el mismo para las dos: no existe la noción
   * de "no leída". `GET /alerts` devuelve el histórico completo paginado, sin marca de
   * visto; un badge sobre eso mostraría el total acumulado —un número que solo sube y
   * nunca se apaga— y unas "últimas N" presentarían alertas viejas como si fueran
   * nuevas. Las dos entrenan al usuario a ignorar el aviso, que es peor que no tenerlo.
   * `/api/documents` tiene el mismo problema por otra vía: está paginado y no devuelve
   * totales.
   *
   * Lo que sí se hizo es dar a las alertas su propio ítem de nav, así el histórico es
   * alcanzable sin depender del email. El renderizado del badge SÍ está implementado en
   * `app-shell.tsx`: cuando el backend exponga `GET /alerts?unread=1` o un
   * `/me/counters` con "vistas desde", basta con llenar este campo.
   */
  badge?: number;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/** Nav de la app de cliente: las pantallas raíz de `app/(app)/`. */
export function appNav(t: Dictionary['shell']): NavSection[] {
  return [
    {
      label: t.section.analysis,
      items: [
        { href: '/dashboard', icon: LayoutGrid, label: t.nav.dashboard },
        // Las tres del prototipo MVP Macha que no existían todavía. El orden es el suyo
        // (panorama → analítica → producto → inventario): va de lo más agregado a lo más
        // granular, que es como se baja a buscar el porqué de un número del panorama.
        { href: '/analytics', icon: BarChart3, label: t.nav.analytics },
        { href: '/product-sales', icon: ShoppingCart, label: t.nav.productSales },
        { href: '/inventory', icon: Boxes, label: t.nav.inventory },
        // CU-868kj0tdq criterio 5: las alertas dejan de colgar del panorama y tienen
        // ítem propio. Antes `/alerts` era solo `matchAlso` de `/dashboard`, porque la
        // única alerta alcanzable era `/alerts/[id]` por deep-link del email; ahora
        // existe el histórico y es una sección, no una pantalla de detalle huérfana.
        { href: '/alerts', icon: AlertTriangle, label: t.nav.alerts },
        { href: '/reports', icon: FileText, label: t.nav.reports },
        { href: '/chat', icon: Bot, label: t.nav.chat },
      ],
    },
    {
      label: t.section.data,
      items: [{ href: '/upload', icon: UploadCloud, label: t.nav.upload }],
    },
    {
      label: t.section.account,
      items: [
        // CU-868kh8pwv: el equipo deja de gestionarse escribiéndole a Macha.
        { href: '/members', icon: Users, label: t.nav.members },
        { href: '/credits', icon: CreditCard, label: t.nav.credits },
        { href: '/settings', icon: Settings, label: t.nav.settings },
      ],
    },
  ];
}

/** Nav del backoffice — mismas rutas que tenía `components/admin/admin-nav.tsx`. */
export function adminNav(t: Dictionary['shell']): NavSection[] {
  return [
    {
      label: t.section.operations,
      items: [
        { href: '/admin', icon: Building2, label: t.adminNav.companies, exact: true },
        { href: '/admin/staging-rows', icon: AlertTriangle, label: t.adminNav.stagingRows },
        { href: '/admin/documents', icon: UploadCloud, label: t.adminNav.uploads },
        { href: '/admin/demo-requests', icon: Inbox, label: t.adminNav.demoRequests },
      ],
    },
    {
      label: t.section.platform,
      items: [
        { href: '/admin/industry-templates', icon: Package, label: t.adminNav.templates },
        // Ticket B3: el catálogo de planes va JUNTO a las reglas de crédito y los
        // parámetros de negocio, no suelto. Los tres son la configuración económica y el
        // reparto entre ellos es deliberado (ver C2 del documento de QA): reglas =
        // cuántos créditos cuesta cada acción; parámetros = equivalencia y precio del
        // crédito; planes = qué incluye cada plan y cuánto vale.
        { href: '/admin/plans', icon: Layers, label: t.adminNav.plans },
        { href: '/admin/credit-rules', icon: CreditCard, label: t.adminNav.creditRules },
        { href: '/admin/config', icon: Settings, label: t.adminNav.config },
        { href: '/admin/ai-cost', icon: Sparkles, label: t.adminNav.aiCost },
      ],
    },
  ];
}

/**
 * Ítem activo: coincidencia exacta o por prefijo de segmento.
 *
 * Había además un `matchAlso` (prefijos extra que activaban un ítem) cuyo único uso era
 * hacer que `/alerts/[id]` marcara `/dashboard`, porque las alertas no tenían sección
 * propia. Con el histórico de CU-868kj0tdq sí la tienen, y `/alerts/<id>` cae bajo
 * `/alerts` por prefijo. Se elimina en vez de dejarlo sin consumidor: nadie lo habría
 * mantenido, y una opción muerta en el modelo de nav invita a usarla mal después.
 */
export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
