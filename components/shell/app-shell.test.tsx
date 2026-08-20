/**
 * CU-868kjbxwa criterio 3: el shell, renderizado de verdad.
 *
 * `nav-config.test.ts` ya fija `isNavItemActive` como función pura. Lo que no se podía
 * fijar sin montar el componente es que el shell **use** esa decisión: que el `<a>` del
 * ítem correcto lleve `aria-current="page"`, que el colapso cambie de estado y que el
 * drawer móvil abra el mismo menú. Son tres ramas reales y ninguna se ejercitaba.
 *
 * Los dobles son solo la frontera con Next: `next/link` necesita el contexto del router
 * de la app, `usePathname` no existe fuera de una request, y los server actions son
 * endpoints RPC que aquí no hay dónde ejecutar. Todo lo demás —el shell, la nav, Radix—
 * es el código de producción.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';

mock.module('next/navigation', () => ({
  usePathname: () => rutaActual,
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
}));

mock.module('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

mock.module('@/app/actions/sign-out', () => ({ signOutAction: async () => undefined }));
mock.module('@/app/actions/set-locale', () => ({ setLocale: async () => undefined }));
mock.module('@/app/actions/set-active-company', () => ({
  setActiveCompany: async () => undefined,
}));

// El org-switcher vive dentro del orgbar del shell y pide sus membresías al montarse.
// Acá solo interesa que no reviente el render; su lógica tiene su propio archivo.
/*
 * ═══ EL DOBLE EXPONE TODO EL MÓDULO, PERO SIN IMPORTARLO ═══
 *
 * `mock.module` de Bun es GLOBAL AL PROCESO, no al archivo. Un doble parcial deja al módulo
 * con solo lo que declara, y cualquier test posterior que importe otro export muere con
 * "Export named ... not found". Pasó de verdad: tumbó `aceptar-invitacion.test.tsx` en CI,
 * donde el orden de archivos difiere del local.
 *
 * La salida obvia —`...(await import('@/lib/api/browser'))`— es PEOR, y también se probó:
 * captura el módulo YA EVALUADO, y su `request` queda ligada al `globalThis.fetch` de ese
 * instante. Eso rompe `lib/api/browser.test.ts`, que sustituye `fetch` para probar el módulo
 * de verdad — sus tests de `request` fallaron en CI exactamente por eso.
 *
 * Por eso los exports se declaran a mano: los que este archivo no necesita fingir se dejan
 * como funciones inertes, y ningún otro test depende de que hagan algo (los que sí usan
 * `requestJson` de verdad traen su propio doble).
 */
mock.module('@/lib/api/browser', () => ({
  request: async () => ({ ok: true, data: { memberships: [], staffTier: null } }),
  requestJson: async () => ({ ok: true, data: {} }),
  errorMessage: () => undefined,
}));

let rutaActual = '/dashboard';

const { AppShell } = await import('@/components/shell/app-shell');
const { getDictionary } = await import('@/lib/i18n/get-dictionary');

const t = getDictionary('es');

function montar(props: Partial<Parameters<typeof AppShell>[0]> = {}) {
  return render(
    <AppShell shell={t.shell} common={t.common} locale="es" userEmail="due@empresa.gt" {...props}>
      <p>contenido</p>
    </AppShell>,
  );
}

/** El shell monta el sidebar dos veces (escritorio + drawer); acota al de escritorio. */
function navDeEscritorio() {
  return screen.getAllByRole('navigation', { name: t.shell.mainNav })[0];
}

beforeEach(() => {
  rutaActual = '/dashboard';
});

afterEach(cleanup);

describe('AppShell — ítem activo', () => {
  test('marca con aria-current solo el ítem de la ruta actual', () => {
    rutaActual = '/reports';
    montar();

    const nav = within(navDeEscritorio());
    expect(nav.getByRole('link', { name: t.shell.nav.reports }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(
      nav.getByRole('link', { name: t.shell.nav.dashboard }).getAttribute('aria-current'),
    ).toBe(null);
  });

  test('una subruta marca activa su sección', () => {
    // El deep-link de una alerta llega desde un email; el sidebar tiene que decir dónde
    // está quien lo abre, no quedarse sin ningún ítem marcado.
    rutaActual = '/alerts/9f3a-de-un-correo';
    montar();

    const nav = within(navDeEscritorio());
    expect(nav.getByRole('link', { name: t.shell.nav.alerts }).getAttribute('aria-current')).toBe(
      'page',
    );
  });

  test('en /admin no se cuela la nav de cliente', () => {
    rutaActual = '/admin/plans';
    montar({ variant: 'admin' });

    const nav = within(navDeEscritorio());
    expect(
      nav.getByRole('link', { name: t.shell.adminNav.plans }).getAttribute('aria-current'),
    ).toBe('page');
    // `variant` es lo único que separa backoffice de app de cliente: si se ignorara, el
    // shell del admin mostraría "Panorama", "Reportes" y compañía.
    expect(nav.queryByRole('link', { name: t.shell.nav.dashboard })).toBe(null);
    // `/admin` es prefijo de las siete rutas del backoffice y va con `exact`.
    expect(
      nav.getByRole('link', { name: t.shell.adminNav.companies }).getAttribute('aria-current'),
    ).toBe(null);
  });
});

describe('AppShell — colapso del sidebar', () => {
  test('el botón alterna el estado y su etiqueta', () => {
    montar();
    // El de escritorio; el drawer no monta botón de colapsar (ya ES el estado angosto).
    const boton = screen.getByRole('button', { name: t.shell.collapse });
    expect(boton.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(boton);

    const colapsado = screen.getByRole('button', { name: t.shell.expand });
    expect(colapsado.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(colapsado);
    expect(screen.getByRole('button', { name: t.shell.collapse })).toBeDefined();
  });

  test('colapsado no esconde la navegación, solo la reduce a íconos', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: t.shell.collapse }));

    // El riel de 56px sigue siendo navegable: los links están ahí, con su texto en
    // `sr-only`. Si el colapso los desmontara, el usuario quedaría sin forma de moverse.
    const nav = within(navDeEscritorio());
    expect(nav.getByRole('link', { name: t.shell.nav.reports })).toBeDefined();
  });
});

describe('AppShell — drawer móvil', () => {
  test('el disparador abre el drawer y la navegación accesible pasa a ser la suya', async () => {
    montar();
    // Cerrado: la única navegación del árbol de accesibilidad es la de escritorio.
    expect(screen.getAllByRole('navigation', { name: t.shell.mainNav })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: t.shell.openMenu }));
    const drawer = await screen.findByRole('dialog');

    // El sidebar se monta DOS veces en el DOM (escritorio + drawer)...
    expect(document.querySelectorAll('nav')).toHaveLength(2);
    // ...pero el diálogo es modal: Radix marca `aria-hidden` en todo lo que queda fuera,
    // así que el de escritorio SALE del árbol de accesibilidad y sigue habiendo una sola
    // navegación anunciable. Es lo correcto y es justo lo que hay que fijar: si el drawer
    // dejara de ser modal, un lector de pantalla vería dos menús idénticos a la vez.
    const navsAccesibles = screen.getAllByRole('navigation', { name: t.shell.mainNav });
    expect(navsAccesibles).toHaveLength(1);
    expect(drawer.contains(navsAccesibles[0])).toBe(true);

    // Y es la MISMA lista de ítems, no una nav recortada.
    expect(within(drawer).getByRole('link', { name: t.shell.nav.upload })).toBeDefined();
  });
});
