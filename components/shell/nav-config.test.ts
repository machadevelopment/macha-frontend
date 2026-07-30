import { describe, expect, it } from 'bun:test';
import { adminNav, appNav, isNavItemActive } from './nav-config';
import { getDictionary } from '@/lib/i18n/get-dictionary';

const t = getDictionary('es').shell;

/**
 * CU-868khvynk: `isNavItemActive` decide el único feedback de "dónde estoy" que tiene
 * el shell. Los casos de abajo son los que se rompen en la práctica.
 */
describe('isNavItemActive', () => {
  const item = (href: string, extra = {}) => ({
    href,
    icon: (() => null) as never,
    label: href,
    ...extra,
  });

  it('marca activo el ítem exacto y sus subrutas', () => {
    expect(isNavItemActive('/reports', item('/reports'))).toBe(true);
    expect(isNavItemActive('/reports/abc', item('/reports'))).toBe(true);
  });

  it('no confunde rutas que solo comparten prefijo de texto', () => {
    // Sin el `/` en la comparación, `/reportsomething` marcaría `/reports` como activo.
    expect(isNavItemActive('/reportsomething', item('/reports'))).toBe(false);
  });

  it('respeta `exact` para las raíces que son prefijo de todo lo demás', () => {
    // `/admin` es prefijo de las siete rutas del backoffice: sin `exact` saldría
    // siempre activo y el ítem real de la sección nunca se distinguiría.
    const admin = item('/admin', { exact: true });
    expect(isNavItemActive('/admin', admin)).toBe(true);
    expect(isNavItemActive('/admin/staging-rows', admin)).toBe(false);
  });

  it('usa `matchAlso` para las pantallas de detalle que no tienen ítem propio', () => {
    // `/alerts/[id]` se llega por deep-link desde el email; sin esto el sidebar se
    // queda sin ítem activo y el usuario aterriza sin saber dónde está.
    const dashboard = item('/dashboard', { matchAlso: ['/alerts'] });
    expect(isNavItemActive('/alerts/abc', dashboard)).toBe(true);
    expect(isNavItemActive('/credits', dashboard)).toBe(false);
  });
});

describe('modelo de navegación', () => {
  it('cubre las cinco pantallas raíz de cliente', () => {
    const hrefs = appNav(t).flatMap((s) => s.items.map((i) => i.href));
    expect(hrefs.sort()).toEqual(['/chat', '/credits', '/dashboard', '/reports', '/upload']);
  });

  it('cubre las siete rutas del backoffice', () => {
    // Mismas rutas que tenía `components/admin/admin-nav.tsx` antes de borrarse: si
    // alguna se perdiera en la migración, la pantalla quedaría inalcanzable.
    const hrefs = adminNav(t).flatMap((s) => s.items.map((i) => i.href));
    expect(hrefs.sort()).toEqual([
      '/admin',
      '/admin/ai-cost',
      '/admin/config',
      '/admin/credit-rules',
      '/admin/documents',
      '/admin/industry-templates',
      '/admin/staging-rows',
    ]);
  });

  it('no deja ningún ítem sin etiqueta traducida', () => {
    for (const locale of ['es', 'en'] as const) {
      const shell = getDictionary(locale).shell;
      const items = [...appNav(shell), ...adminNav(shell)].flatMap((s) => s.items);
      expect(items.every((i) => i.label.length > 0)).toBe(true);
    }
  });
});
