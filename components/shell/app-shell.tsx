'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MachaMark } from '@/components/ui/macha-mark';

/**
 * El wordmark oficial — CU-868kt32ae.
 *
 * Macha señaló el logo del sidebar. Decía **"Macha"**, y el logotipo del Brand Book es
 * **"Macha Finance"**: isotipo de tres barras + el nombre completo
 * (`LOGO/WORDMARK/PNG/MACHA FINANCE EXPORT-09.png`). Abreviar el nombre de la marca en el
 * único lugar donde aparece en toda la aplicación no es un detalle de espacio — es la
 * identidad a medias, y en la pantalla que un inversionista mira primero.
 *
 * Va como TEXTO y no como imagen a propósito, y no es una concesión: el wordmark del Brand
 * Book está compuesto en **SF Pro Display**, que esta aplicación ya auto-hospeda
 * (`lib/fonts.ts`). Renderizarlo con la propia tipografía lo reproduce con fidelidad y
 * además escala, respeta el modo oscuro, no pesa y no cuesta una request — todo lo que un
 * PNG de 1600px no hace. Es el mismo razonamiento que ya documenta `MachaMark` sobre por
 * qué el isotipo es SVG inline y no el PNG del manual.
 *
 * Constante y no texto suelto porque aparece en DOS lugares (la topbar móvil y el sidebar):
 * dos literales es como uno se corrige y el otro no.
 *
 * NO va al diccionario i18n: es un nombre propio, y no se traduce.
 */
const WORDMARK = 'Macha Finance';
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
          // y la navegación pasa al drawer. Arriba, `grid-template-columns: 240px 1fr`;
          // colapsado deja un riel de solo íconos en vez de esconder la nav.
          //
          // CU-868kt8bg0: 240px es el ancho del prototipo (`aside w-[240px]`). El design
          // guide §4.4 decía 212 y se corrige acá — con los ítems ya a las medidas del
          // prototipo (px-3 + gap-3 + ícono de 16), 212 dejaba las etiquetas largas
          // truncando contra el borde, que es peor que los 28px de columna.
          'grid-cols-1',
          collapsed ? 'app:grid-cols-[56px_1fr]' : 'app:grid-cols-[240px_1fr]',
          /*
           * FILAS EXPLÍCITAS (CU-868krvtya). Bajo 1080px el grid tiene dos hijos visibles
           * —la topbar móvil y el contenido— y sus filas eran `auto`. Con `align-content`
           * en su valor por defecto, el espacio sobrante de un contenedor más alto que su
           * contenido se reparte ENTRE LAS FILAS AUTO: la topbar se inflaría junto con el
           * contenido en cualquier pantalla que no llene el alto.
           *
           * Nunca se notó porque todas las pantallas llenaban de sobra. El chat a pantalla
           * completa es la primera que puede no hacerlo, y era una bomba puesta para
           * cualquiera que agregara otra. `auto` para la topbar, `1fr` para el contenido:
           * el sobrante va entero donde tiene que ir.
           *
           * Arriba de 1080px la topbar es `display: none` y queda UNA fila con dos
           * columnas, así que se declara una sola pista.
           */
          'grid-rows-[auto_1fr] app:grid-rows-[1fr]',
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
                className="rounded-sm p-1.5 text-faint transition-colors hover:bg-muted hover:text-foreground"
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
            {/* CU-868ktkwqn: monocromo en el chrome de navegación — ver la nota junto al
                otro montaje, en SidebarBody, sobre por qué acá no aplica el salvia de marca. */}
            <MachaMark monochrome />
            {WORDMARK}
          </Link>
          <div className="ml-auto flex items-center">
            <LocaleSwitcher locale={locale} />
            <ThemeSwitcher labels={common.theme} />
          </div>
        </div>

        {/*
          `min-w-0` para que las tablas/charts anchos no estiren el grid (design guide.md §7).

          `flex flex-col min-h-0` es de CU-868krvtya, y no cambia nada para las pantallas
          que ya existían: en una columna flex un hijo conserva su alto de contenido salvo
          que pida crecer. Lo que habilita es que una pantalla SÍ pueda pedirlo con `flex-1`
          —el chat, que ocupa el alto completo y scrollea adentro— sin depender de que
          `height: 100%` resuelva contra una celda de grid cuyo alto sale de un `min-height`.
          Con `flex-1` el alto lo reparte el contenedor y no hay porcentaje que resolver.
        */}
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">{children}</div>
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
          {/* Colapsado, el isotipo lleva el nombre completo como nombre ACCESIBLE aunque
              el texto no se vea: un lector de pantalla tiene que anunciar la marca, no una
              abreviatura que solo existe por falta de ancho. */}
          {/*
            CU-868ktkwqn — QA de Macha: "las 3 líneas del logo que sean solo negras o
            blancas según el tema". El isotipo salvia (degradado de marca, `MachaMark` sin
            `monochrome`) sigue siendo el correcto para vitrina (`app/page.tsx`,
            `components/ui/showcase.tsx`, la regla de los DOS VERDES en CLAUDE.md lo dice
            explícito: "Insight Point, acentos, pantallas de vitrina"). El riel de
            navegación no es vitrina — conviven ahí con texto e íconos que sí siguen el
            tema (`text-foreground`), y el salvia fijo desentonaba en modo oscuro y no
            respondía al tema en ninguno de los dos. `monochrome` ya existía para esto
            exacto (heredar `currentColor` desde el `Link` que ya trae `text-foreground`)
            — no hace falta un segundo SVG ni un hex nuevo.
          */}
          <MachaMark monochrome label={collapsed ? WORDMARK : undefined} />
          <span className={cn(collapsed && 'app:hidden')}>{WORDMARK}</span>
        </Link>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? shell.expand : shell.collapse}
          aria-expanded={!collapsed}
          className="hidden rounded-sm p-1.5 text-faint transition-colors hover:bg-muted hover:text-foreground app:block"
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
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-body text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-[15px] w-[15px] shrink-0" strokeWidth={1.7} />
            <span className={collapsed ? 'app:sr-only' : ''}>{common.signOut}</span>
          </button>
        </form>
      </div>
    </>
  );
}

/**
 * Ítem de nav (`ni`): activo con `fill` + peso 600, ícono Lucide a strokeWidth 1.7.
 *
 * CU-868kt8bg0 — medidas del prototipo (`src/components/DashboardSidebar.tsx`):
 * `gap-3 px-3 py-2 rounded-md text-sm` con el ícono en 16 px. Los nuestros eran
 * `gap-2 px-2 py-1.5 rounded-[7px]` con ícono de 15. Es al revés que el resto del
 * ticket: acá el prototipo es MÁS holgado que nosotros, y se sigue igual, porque la
 * navegación es lo que el ojo recorre para orientarse — apretarla no gana pantalla
 * (la columna ya está reservada), solo dificulta apuntar.
 *
 * `rounded-[7px]` era además un radio FUERA de la escala (5/8/10/11/22). El ticket pide
 * explícitamente "mantener el mismo redondeado en todos los componentes"; siete no era
 * ninguno de los cinco y no había forma de notarlo mirando.
 */
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
        'flex items-center gap-3 rounded-md px-3 py-2 text-body transition-colors',
        collapsed && 'app:justify-center',
        active
          ? 'bg-muted font-semibold text-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.7} />
      <span className={cn('truncate', collapsed && 'app:sr-only')}>{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span
          className={cn(
            'ml-auto rounded-pill bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground',
            collapsed && 'app:sr-only',
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}
