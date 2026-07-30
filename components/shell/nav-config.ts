import {
  AlertTriangle,
  Bot,
  Building2,
  CreditCard,
  FileText,
  LayoutGrid,
  Package,
  Settings,
  Sparkles,
  UploadCloud,
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
 * `box→Package`, `gear→Settings`, `spark→Sparkles`).
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
  /** Prefijos extra que también marcan este ítem como activo (pantallas de detalle). */
  matchAlso?: string[];
  /**
   * Badge de contador (design guide.md §8: "filas por revisar, alertas").
   *
   * **Diferido a propósito, no olvidado.** Hoy no existe ninguna fuente de la que
   * salga un contador correcto para el cliente: `/api/alerts/[id]` es solo el detalle
   * (no hay endpoint de listado ni de no-leídas), y `/api/documents` está paginado y
   * no devuelve totales — contar la primera página daría un número que miente en
   * cuanto haya más de 50 cargas. Poner un número inventado en la nav es peor que no
   * ponerlo. El renderizado del badge SÍ está implementado en `app-shell.tsx`: cuando
   * el backend exponga `GET /alerts?unread=1` (o un `/me/counters`), basta con llenar
   * este campo.
   */
  badge?: number;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/** Nav de la app de cliente: las cinco pantallas raíz de `app/(app)/`. */
export function appNav(t: Dictionary['shell']): NavSection[] {
  return [
    {
      label: t.section.analysis,
      items: [
        // `/alerts/[id]` cuelga conceptualmente del panorama: sin `matchAlso` el
        // sidebar se quedaría sin ítem activo al abrir una alerta.
        {
          href: '/dashboard',
          icon: LayoutGrid,
          label: t.nav.dashboard,
          matchAlso: ['/alerts'],
        },
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
      items: [{ href: '/credits', icon: CreditCard, label: t.nav.credits }],
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
      ],
    },
    {
      label: t.section.platform,
      items: [
        { href: '/admin/industry-templates', icon: Package, label: t.adminNav.templates },
        { href: '/admin/credit-rules', icon: CreditCard, label: t.adminNav.creditRules },
        { href: '/admin/config', icon: Settings, label: t.adminNav.config },
        { href: '/admin/ai-cost', icon: Sparkles, label: t.adminNav.aiCost },
      ],
    },
  ];
}

/** Ítem activo: exacto, por prefijo de segmento, o por los prefijos de `matchAlso`. */
export function isNavItemActive(pathname: string, item: NavItem): boolean {
  const matches = (prefix: string) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`);
  if (item.exact) return pathname === item.href;
  return matches(item.href) || (item.matchAlso ?? []).some(matches);
}
