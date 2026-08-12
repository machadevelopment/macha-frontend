'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MachaMark } from '@/components/ui/macha-mark';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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
 * Antes de ese ticket `app/(app)/` no tenía `layout.tsx`: cada una de las siete
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
 * **Responsive (CU-868khvzbd).** El patrón elegido bajo 1080px es **drawer con `Sheet`**
 * — la primera de las tres opciones que el design guide §Huecos dejaba abiertas
 * (drawer / bottom-nav / header colapsado). Razones, en orden:
 *   - El drawer es *el mismo* sidebar en otro contenedor: una sola lista de ítems, un
 *     solo modelo de activo. Un bottom-nav obliga a elegir 4-5 ítems y a inventar un
 *     "más", o sea una segunda jerarquía que mantener.
 *   - El backoffice tiene siete ítems en dos secciones; en un bottom-nav no entran.
 *   - `components/ui/sheet.tsx` (Radix) ya estaba instalado y sin usar precisamente
 *     para esto (criterio 5 del ticket: se aprovecha).
 *
 * El contenido del sidebar vive una sola vez en `SidebarBody`, y se monta en el
 * `<aside>` de escritorio o dentro del `Sheet` en móvil. Duplicarlo era garantizar
 * que las dos versiones se separaran.
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sections = variant === 'admin' ? adminNav(shell) : appNav(shell);
  const home = variant === 'admin' ? '/admin' : '/dashboard';

  // Navegar dentro del drawer no desmonta el shell (es el layout), así que el Sheet
  // se quedaría abierto sobre la pantalla nueva. Se cierra al cambiar de ruta.
  useEffect(() => setDrawerOpen(false), [pathname]);

  // El drawer se monta con `collapsed={false}` a propósito: el colapso es un estado del
  // sidebar de escritorio y no significa nada dentro del drawer, que ya ES el estado
  // angosto. Compartir el booleano dejaría el org-switcher sin nombre de empresa en
  // móvil si el usuario había colapsado el sidebar antes de achicar la ventana — el
  // `OrgSwitcher` lo decide en JS, no con clases, así que el prefijo `app:` no lo cubre.
  const body = (collapsedInThisInstance: boolean) => (
    <SidebarBody
      variant={variant}
      shell={shell}
      common={common}
      locale={locale}
      userEmail={userEmail}
      activeCompanyId={activeCompanyId}
      sections={sections}
      home={home}
      pathname={pathname}
      collapsed={collapsedInThisInstance}
      onToggleCollapse={() => setCollapsed((v) => !v)}
    />
  );

  return (
    // Densidad compacta en el shell (design guide.md §12); cada pantalla puede
    // declarar la suya en su propio <main> sin que esto la pise.
    <div data-density="compact" className="min-h-dvh bg-background p-2 app:p-3">
      <div
        className={cn(
          'mx-auto grid max-w-app overflow-hidden rounded-lg border border-border bg-background',
          // `dvh` y no `vh` (CU-868knx16t). En móvil la barra de direcciones NO se
          // descuenta de `100vh`: el navegador reporta la altura de la ventana con la
          // barra ya retraída, así que el alto mínimo quedaba ~60-100px por encima del
          // área realmente visible y se podía hacer scroll contra el vacío en todas las
          // pantallas a la vez — esto es el layout compartido. `dvh` sigue a la barra.
          'min-h-[calc(100dvh-1rem)] app:min-h-[calc(100dvh-1.5rem)]',
          // design guide.md §Responsive: bajo 1080px `app → 1fr`, el sidebar se oculta
          // y la navegación pasa al drawer. Arriba, `grid-template-columns: 212px 1fr`
          // (§4.4); colapsado deja un riel de solo íconos en vez de esconder la nav.
          'grid-cols-1',
          collapsed ? 'app:grid-cols-[56px_1fr]' : 'app:grid-cols-[212px_1fr]',
        )}
      >
        <aside className="hidden min-h-0 flex-col border-r border-border bg-card app:flex">
          {body(collapsed)}
        </aside>

        {/*
          Topbar móvil: solo existe bajo 1080px. Lleva el disparador del drawer, el
          wordmark y los controles de idioma/tema — en el drawer quedarían a un tap de
          distancia extra y son los dos que más se tocan.
        */}
        <div className="flex items-center gap-2 border-b border-border bg-card px-2 py-2 app:hidden">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label={shell.openMenu}
                className="rounded-[6px] p-1.5 text-faint transition-colors hover:bg-muted hover:text-foreground"
              >
                <Menu className="h-5 w-5" strokeWidth={1.7} />
              </button>
            </SheetTrigger>
            <SheetContent side="left" closeLabel={common.close} className="flex flex-col p-0">
              {/* Radix exige un título accesible en el Dialog; visualmente lo cubre el
                  wordmark, así que va solo para lectores de pantalla. */}
              <SheetTitle className="sr-only">{shell.mainNav}</SheetTitle>
              {body(false)}
            </SheetContent>
          </Sheet>
          <Link
            href={home}
            className="flex items-center gap-1.5 font-ui text-[17px] font-bold tracking-[-0.03em] text-foreground"
          >
            <MachaMark />
            Macha
          </Link>
          <div className="ml-auto flex items-center">
            <LocaleSwitcher locale={locale} />
            <ThemeSwitcher labels={common.theme} />
          </div>
        </div>

        {/* `min-w-0` para que las tablas/charts anchos no estiren el grid (design guide.md §7). */}
        <div className="min-w-0 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

/**
 * Contenido del sidebar. Se monta dos veces —`<aside>` en escritorio, `Sheet` en
 * móvil— pero se escribe una sola vez a propósito: son la misma navegación.
 *
 * El botón de colapsar solo aparece en la variante de escritorio (`app:` en su
 * clase): dentro del drawer no tiene sentido, el drawer ya es el estado colapsado.
 */
function SidebarBody({
  variant,
  shell,
  common,
  locale,
  userEmail,
  activeCompanyId,
  sections,
  home,
  pathname,
  collapsed,
  onToggleCollapse,
}: {
  variant: 'app' | 'admin';
  shell: Dictionary['shell'];
  common: Dictionary['common'];
  locale: Locale;
  userEmail: string;
  activeCompanyId?: string;
  sections: ReturnType<typeof appNav>;
  home: string;
  pathname: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <>
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-3',
          collapsed ? 'app:justify-center' : 'justify-between',
        )}
      >
        {/*
          Wordmark, no clave de i18n: es la marca (design guide.md §7, 700 / -0.03em).

          CU-868knx0vh: se le suma el isotipo de tres barras del Brand Book. Cuando el
          sidebar está colapsado el texto se esconde pero el ISOTIPO SE QUEDA — un riel de
          56px sin ninguna marca deja la app sin identidad y sin punto de retorno al
          inicio, que es lo que este link es.
        */}
        <Link
          href={home}
          className={cn(
            'flex items-center gap-1.5 font-ui text-[17px] font-bold tracking-[-0.03em] text-foreground',
            collapsed && 'app:justify-center',
          )}
        >
          <MachaMark label={collapsed ? 'Macha' : undefined} />
          <span className={cn(collapsed && 'app:hidden')}>Macha</span>
        </Link>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? shell.expand : shell.collapse}
          aria-expanded={!collapsed}
          className="hidden rounded-[6px] p-1.5 text-faint transition-colors hover:bg-muted hover:text-foreground app:block"
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
        <OrgSwitcher initialCompanyId={activeCompanyId} labels={common} collapsed={collapsed} />
      </div>

      <nav aria-label={shell.mainNav} className="min-h-0 flex-1 overflow-y-auto p-2">
        {sections.map((section) => (
          <div key={section.label} className="mb-3 last:mb-0">
            <p
              className={cn(
                'px-2 pb-1.5 pt-2 font-mono text-eyebrow uppercase text-faint',
                collapsed && 'app:hidden',
              )}
            >
              {section.label}
            </p>
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
            collapsed && 'app:flex-col app:items-stretch',
          )}
        >
          <Avatar className="h-6 w-6 shrink-0 self-center">
            <AvatarFallback className="font-mono text-[10px] uppercase text-muted-foreground">
              {userEmail.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <span
            title={userEmail}
            className={cn(
              'min-w-0 flex-1 truncate font-mono text-[11.5px] text-muted-foreground',
              collapsed && 'app:hidden',
            )}
          >
            {userEmail}
          </span>
          <div className={cn('flex shrink-0 items-center', collapsed && 'app:flex-col')}>
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
            <span className={collapsed ? 'app:sr-only' : ''}>{common.signOut}</span>
          </button>
        </form>
      </div>
    </>
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
        collapsed && 'app:justify-center',
        active
          ? 'bg-muted font-semibold text-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.7} />
      <span className={cn('truncate', collapsed && 'app:sr-only')}>{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span
          className={cn(
            'ml-auto rounded-[20px] bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground',
            collapsed && 'app:sr-only',
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}
