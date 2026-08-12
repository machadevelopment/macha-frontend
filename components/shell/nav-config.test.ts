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

  it('mantiene activo el ítem al abrir una pantalla de detalle', () => {
    // A `/alerts/[id]` se llega por deep-link desde el email: sin esto el sidebar se
    // queda sin ítem activo y el usuario aterriza sin saber dónde está.
    expect(isNavItemActive('/alerts/abc', item('/alerts'))).toBe(true);
    expect(isNavItemActive('/credits', item('/alerts'))).toBe(false);
  });
});

describe('modelo de navegación', () => {
  it('cubre las diez pantallas raíz de cliente', () => {
    // `/alerts` entra en CU-868kj0tdq: antes solo existía `/alerts/[id]` (deep-link del
    // email) y colgaba de `/dashboard` por `matchAlso`. Ahora hay histórico y es sección.
    // `/members` entra en CU-868kh8pwv: el equipo deja de gestionarse escribiéndole a
    // Macha, así que necesita puerta propia y no solo una URL que alguien recuerde.
    // `/analytics`, `/product-sales` e `/inventory` son las tres del prototipo MVP Macha
    // que no se habían construido: sin ítem de nav, una pantalla nueva solo existe para
    // quien se sepa la URL, que es como se quedan sin usar.
    const hrefs = appNav(t).flatMap((s) => s.items.map((i) => i.href));
    expect(hrefs.sort()).toEqual([
      '/alerts',
      '/analytics',
      '/chat',
      '/credits',
      '/dashboard',
      '/inventory',
      '/members',
      '/product-sales',
      '/reports',
      '/upload',
    ]);
  });

  it('cubre las ocho rutas del backoffice', () => {
    // Las siete que tenía `components/admin/admin-nav.tsx` antes de borrarse —si alguna se
    // hubiera perdido en la migración, la pantalla quedaría inalcanzable— más
    // `/admin/plans`, el catálogo de planes del ticket B3.
    //
    // Esta lista es explícita a propósito y NO se deriva del propio `adminNav`: derivarla
    // haría que el test pasara siempre, incluida la vez en que alguien borre una ruta sin
    // querer. Que agregar una pantalla obligue a tocar este archivo ES la función del test.
    const hrefs = adminNav(t).flatMap((s) => s.items.map((i) => i.href));
    expect(hrefs.sort()).toEqual([
      '/admin',
      '/admin/ai-cost',
      '/admin/config',
      '/admin/credit-rules',
      '/admin/documents',
      '/admin/industry-templates',
      '/admin/plans',
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
