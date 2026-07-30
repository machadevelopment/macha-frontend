'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { OrgSwitcher } from '@/components/org-switcher';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { signOutAction } from '@/app/actions/sign-out';
import { adminNav, appNav, isNavItemActive, type NavItem } from '@/components/shell/nav-config';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * Shell de navegación compartido (CU-868khvynk, design guide.md §4.4 y §7).
 *
 * Antes de este ticket `app/(app)/` no tenía `layout.tsx`: cada una de las siete
 * pantallas de cliente renderizaba su `<main>` suelto y la única navegación era una
 * lista de `<a>` planos en `/`. Desde `/dashboard` no había forma de llegar a
 * `/reports` salvo escribiendo la URL.
 *
 * Un solo componente sirve a la app de cliente y al backoffice (`variant="admin"`).
 * La diferencia es exactamente la que pide el design guide: superficie inversa en el
 * orgbar y otro conjunto de ítems (`nav-config.ts`), no otra identidad visual.
 *
 * Es client component porque necesita `usePathname()` para el ítem activo y estado
 * local para el colapso. El estado NO se persiste: CLAUDE.md prohíbe
 * localStorage/sessionStorage, y una cookie por un detalle de UI así no se justifica.
 *
 * Responsive: el design guide manda ocultar el sidebar bajo 1080px y pasar a un
 * drawer con `Sheet`. Eso es un ticket aparte — ocultarlo aquí sin el drawer
 * recrearía exactamente el bug que este ticket arregla, así que el sidebar se
 * mantiene visible en todos los anchos.
 */
export interface AppShellProps {
  variant?: 'app' | 'admin';
  shell: Dictionary['shell'];
  common: Dictionary['common'];
  locale: Locale;
  userEmail: string;
  activeCompanyId?: string;
  children: React.ReactNode;
}

export function AppShell({
  variant = 'app',
  shell,
  common,
  locale,
  userEmail,
  activeCompanyId,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const sections = variant === 'admin' ? adminNav(shell) : appNav(shell);
  const home = variant === 'admin' ? '/admin' : '/dashboard';

  return (
    // Densidad compacta en el shell (design guide.md §12); cada pantalla puede
    // declarar la suya en su propio <main> sin que esto la pise.
    <div data-density="compact" className="min-h-screen bg-background p-3">
      <div
        className={cn(
          'mx-auto grid max-w-app overflow-hidden rounded-lg border border-border bg-background',
          'min-h-[calc(100vh-1.5rem)]',
          // design guide.md §4.4: `grid-template-columns: 212px 1fr`. Colapsado deja
          // un riel de solo íconos en vez de esconder la nav entera.
          collapsed ? 'grid-cols-[56px_1fr]' : 'grid-cols-[212px_1fr]',
        )}
      >
        <aside className="flex min-h-0 flex-col border-r border-border bg-card">
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-3',
              collapsed ? 'justify-center' : 'justify-between',
            )}
          >
            {/* Wordmark, no clave de i18n: es la marca (design guide.md §7, Inter 700 / -0.03em). */}
            {!collapsed && (
              <Link
                href={home}
                className="font-ui text-[17px] font-bold tracking-[-0.03em] text-foreground"
              >
                Macha
              </Link>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? shell.expand : shell.collapse}
              aria-expanded={!collapsed}
              className="rounded-[6px] p-1.5 text-faint transition-colors hover:bg-muted hover:text-foreground"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" strokeWidth={1.7} />
              ) : (
                <PanelLeftClose className="h-4 w-4" strokeWidth={1.7} />
              )}
            </button>
          </div>

          {/*
            orgbar (design guide.md §5). En `/admin/*` usa la superficie inversa para
            señalar contexto de backoffice. Se referencian los primitivos `--surface` /
            `--ink` y no `bg-card`/`text-foreground` porque `.inverse` redefine los
            primitivos: las semánticas (`--card: var(--surface)`) ya quedaron resueltas
            en `:root` y no vuelven a evaluarse en el scope hijo.
          */}
          <div
            className={cn(
              'border-y border-border px-2 py-2',
              variant === 'admin' && 'inverse bg-[var(--surface)] text-[var(--ink)]',
            )}
          >
            <OrgSwitcher
              initialCompanyId={activeCompanyId}
              labels={common}
              collapsed={collapsed}
            />
          </div>

          <nav aria-label={shell.mainNav} className="min-h-0 flex-1 overflow-y-auto p-2">
            {sections.map((section) => (
              <div key={section.label} className="mb-3 last:mb-0">
                {collapsed ? (
                  <hr className="mx-2 mb-2 border-t border-border first:hidden" />
                ) : (
                  <p className="px-2 pb-1.5 pt-2 font-mono text-eyebrow uppercase text-faint">
                    {section.label}
                  </p>
                )}
                <ul className="flex flex-col gap-0.5">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <NavLink
                        item={item}
                        active={isNavItemActive(pathname, item)}
                        collapsed={collapsed}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/*
            side-bot (design guide.md §7): identidad de la sesión + idioma + tema + salir.
            El correo hace de acceso a perfil — no hay ruta `/profile` todavía, y un
            link muerto es peor que ninguno.

            CU-868khvzdf: el control de tema va aquí y no en cada superficie, así queda
            en la app de cliente y en `/admin/*` con un solo montaje (criterio 3).
          */}
          <div className="mt-auto flex flex-col gap-1 border-t border-border p-2">
            <div
              className={cn(
                'flex min-w-0 items-center gap-2',
                collapsed && 'flex-col items-stretch',
              )}
            >
              <Avatar className="h-6 w-6 shrink-0 self-center">
                <AvatarFallback className="font-mono text-[10px] uppercase text-muted-foreground">
                  {userEmail.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <span
                  title={userEmail}
                  className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-muted-foreground"
                >
                  {userEmail}
                </span>
              )}
              <div className={cn('flex shrink-0 items-center', collapsed && 'flex-col')}>
                <LocaleSwitcher locale={locale} />
                <ThemeSwitcher labels={common.theme} />
              </div>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                title={collapsed ? common.signOut : undefined}
                className="flex w-full items-center gap-2 rounded-[7px] px-2 py-1.5 text-body text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-[15px] w-[15px] shrink-0" strokeWidth={1.7} />
                <span className={collapsed ? 'sr-only' : ''}>{common.signOut}</span>
              </button>
            </form>
          </div>
        </aside>

        {/* `min-w-0` para que las tablas/charts anchos no estiren el grid (design guide.md §7). */}
        <div className="min-w-0 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

/** Ítem de nav (`ni`): activo con `fill` + peso 600, ícono Lucide a strokeWidth 1.7. */
function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-2 rounded-[7px] px-2 py-1.5 text-body transition-colors',
        collapsed && 'justify-center',
        active
          ? 'bg-muted font-semibold text-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.7} />
      <span className={cn('truncate', collapsed && 'sr-only')}>{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span
          className={cn(
            'rounded-[20px] bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-muted-foreground',
            collapsed ? 'sr-only' : 'ml-auto',
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}
